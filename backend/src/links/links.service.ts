import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PinoLogger } from "nestjs-pino";
import { VISIT_QUEUE } from "../bullmq/bullMq.constant";
import { Link, Prisma, User } from "../generated/prisma/client";
import { PrismaService } from "../prismaClient/prisma.service";
import { LINK_CACHE_TTL_SECONDS, REDIS_CLIENT } from "../redis/redis.constants";
import { ShortCodeService } from "../short-code/short-code.service";
import { VisitsService } from "../visits/visits.service";
import {
  CachedLink,
  CreateLinkDto,
  getLinkDto,
  GetLinksQueryDto,
  LinkSortBy,
  SetActiveLinkDto,
  SetPinLinkDto,
  SortOrder,
  UpdateLinkDto,
  VisitContext,
} from "./dto";

const MAX_GENERATION_ATTEMPTS = 5;
const UNIQUE_CONSTRAINT_ERROR_CODE = "P2002";

type AuthorInfo = Pick<User, "id" | "name" | "email">;
type LinkDataWithoutCode = Omit<Prisma.LinkCreateInput, "shortCode">;

@Injectable()
export class LinksService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    @Inject(VISIT_QUEUE) private bullMQ: Queue,
    private readonly prisma: PrismaService,
    private readonly shortCodeService: ShortCodeService,
    private readonly visitsService: VisitsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LinksService.name);
  }

  async getUserAllLinks(user: AuthorInfo, query: GetLinksQueryDto = {}) {
    const { limit = 10, offset = 0 } = query;
    const sortBy = query.sortBy ?? LinkSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? SortOrder.DESC;
    let expiredCondition = {};
    let searchCondition = {};
    let orderByCondition = {};

    if (query.expired === true) {
      expiredCondition = { expiresAt: { lte: new Date() } };
    } else if (query.expired === false) {
      expiredCondition = {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };
    }

    if (query.search) {
      searchCondition = {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { originalUrl: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const noFilterOrSortRequested =
      query.sortBy === undefined &&
      query.isActive === undefined &&
      query.isPin === undefined &&
      query.expired === undefined;

    if (noFilterOrSortRequested) {
      orderByCondition = [
        { isPin: SortOrder.DESC },
        { isActive: SortOrder.DESC },
        { createdAt: SortOrder.DESC },
        { id: SortOrder.DESC },
      ];
    } else {
      orderByCondition =
        sortBy === LinkSortBy.CREATED_AT
          ? [{ createdAt: sortOrder }, { id: sortOrder }]
          : [
              { expiresAt: { sort: sortOrder, nulls: "last" } },
              { id: sortOrder },
            ];
    }

    const whereCondition = {
      isActive: query.isActive,
      isPin: query.isPin,
      authorId: user.id,
      AND: [searchCondition, expiredCondition],
      deletedAt: null,
    };

    const [links, totalCount] = await Promise.all([
      this.prisma.link.findMany({
        skip: offset,
        take: limit,
        where: whereCondition,
        orderBy: orderByCondition,
      }),
      this.prisma.link.count({
        where: whereCondition,
      }),
    ]);

    return {
      links,
      totalCount,
      limit,
      offset,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async getStatistics() {
    const totalActiveLinks = await this.prisma.link.count({
      where: { isActive: true, deletedAt: null },
    });

    const totalVisits = await this.prisma.visit.count();

    const totalActiveUsers = await this.prisma.user.count();

    return {
      totalActiveLinks,
      totalVisits,
      totalActiveUsers,
    };
  }

  async createUserLink(
    createData: CreateLinkDto,
    author: AuthorInfo,
  ): Promise<Link> {
    const shortCode = createData.suggestedCode
      ? await this.reserveSuggestedCode(createData.suggestedCode)
      : undefined;

    const data = {
      author: { connect: { id: author.id } },
      originalUrl: createData.originalUrl,
      title: createData.title,
      expiresAt: createData.expiresAt,
    };

    if (shortCode) {
      return this.prisma.link.create({ data: { ...data, shortCode } });
    }

    return this.createWithGeneratedCode(data);
  }

  private async reserveSuggestedCode(suggestedCode: string): Promise<string> {
    const existingLink = await this.prisma.link.findUnique({
      where: { shortCode: suggestedCode },
      select: { id: true },
    });

    if (existingLink) {
      throw new ConflictException("این کد قبلا استفاده شده است");
    }

    return suggestedCode;
  }

  private async createWithGeneratedCode(
    data: LinkDataWithoutCode,
  ): Promise<Link> {
    const totalLinks = await this.prisma.link.count();
    const codeLength = this.calculateCodeLength(totalLinks);

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const shortCode = this.shortCodeService.generate(codeLength);

      try {
        return await this.prisma.link.create({ data: { ...data, shortCode } });
      } catch (err) {
        if (this.isUniqueConstraintViolation(err)) {
          continue;
        }
        throw err;
      }
    }

    throw new InternalServerErrorException(
      "امکان ساخت کد کوتاه یکتا وجود نداشت، دوباره تلاش کنید",
    );
  }

  private calculateCodeLength(totalLinks: number): number {
    if (totalLinks < 1_000) return 4;
    if (totalLinks < 100_000) return 5;
    if (totalLinks < 5_000_000) return 6;
    return 7;
  }

  private isUniqueConstraintViolation(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === UNIQUE_CONSTRAINT_ERROR_CODE
    );
  }

  async visitLink(userRequest: VisitContext, getData: getLinkDto) {
    const shortCodeExistString = await this.redis.get(
      `link:${getData.shortCode}`,
    );

    let userData: CachedLink;

    if (shortCodeExistString) {
      const shortCodeExist = JSON.parse(shortCodeExistString) as CachedLink;

      userData = shortCodeExist;
    } else {
      const link = await this.prisma.link.findFirst({
        where: {
          shortCode: getData.shortCode,
          isActive: true,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!link) {
        throw new NotFoundException("کد کوتاه نامعبتر است.");
      }

      userData = { id: link.id, originalUrl: link.originalUrl };

      await this.redis.set(
        `link:${link?.shortCode}`,
        JSON.stringify({ id: link.id, originalUrl: link.originalUrl }),
        "EX",
        LINK_CACHE_TTL_SECONDS,
        "NX",
      );
    }

    const visit = { ...userRequest, ...userData };
    let visitId: number | undefined;

    try {
      visitId = (await this.visitsService.recordVisit(visit)).id;
    } catch (err: unknown) {
      this.logger.error(
        { err, shortCode: getData.shortCode },
        "failed to record visit before redirect",
      );
    }

    this.bullMQ
      .add(
        "recordVisit",
        { ...visit, visitId },
        {
          removeOnComplete: 100,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err, shortCode: getData.shortCode },
          "failed to enqueue visit-processing job",
        );
      });

    return userData.originalUrl;
  }

  async setPinLink(updateData: SetPinLinkDto, user: AuthorInfo) {
    const linkData = await this.prisma.link.findUnique({
      where: { id: updateData.linkId },
    });

    if (!linkData) {
      throw new NotFoundException("لینک شما نامعتبر است.");
    }

    if (linkData.authorId !== user.id) {
      throw new ForbiddenException("شما دسترسی به این لینک ندارید.");
    }

    return this.prisma.link.update({
      where: { id: updateData.linkId },
      data: { isPin: updateData.isPin },
    });
  }

  async setActiveLink(updateData: SetActiveLinkDto, user: AuthorInfo) {
    const linkData = await this.prisma.link.findUnique({
      where: { id: updateData.linkId },
    });

    if (!linkData) {
      throw new NotFoundException("لینک شما نامعتبر است.");
    }

    if (linkData.authorId !== user.id) {
      throw new ForbiddenException("شما دسترسی به این لینک ندارید.");
    }

    const updatedLink = await this.prisma.link.update({
      where: { id: updateData.linkId },
      data: { isActive: updateData.isActive },
    });

    await this.redis.del(`link:${linkData.shortCode}`);

    return updatedLink;
  }

  async deleteLink(linkId: number, user: AuthorInfo) {
    const linkData = await this.prisma.link.findUnique({
      where: { id: linkId },
    });

    if (!linkData) {
      throw new NotFoundException("لینک شما نامعتبر است.");
    }

    if (linkData.authorId !== user.id) {
      throw new ForbiddenException("شما دسترسی به این لینک ندارید.");
    }

    const deletedLink = await this.prisma.link.update({
      where: { id: linkId },
      data: { deletedAt: new Date() },
    });

    await this.redis.del(`link:${linkData.shortCode}`);

    return deletedLink;
  }

  async updateLink(updateData: UpdateLinkDto, user: AuthorInfo) {
    const linkData = await this.prisma.link.findUnique({
      where: { id: updateData.linkId },
    });

    if (!linkData) {
      throw new NotFoundException("لینک شما نامعتبر است.");
    }

    if (linkData.authorId !== user.id) {
      throw new ForbiddenException("شما دسترسی به این لینک ندارید.");
    }

    let newShortCode: string | undefined;
    if (updateData.shortCode && updateData.shortCode !== linkData.shortCode) {
      newShortCode = await this.reserveSuggestedCode(updateData.shortCode);
    }

    if (updateData.originalUrl !== undefined || newShortCode !== undefined) {
      await this.redis.del(`link:${linkData?.shortCode}`);
    }

    return await this.prisma.link.update({
      where: { id: updateData.linkId },
      data: {
        title: updateData.title,
        originalUrl: updateData.originalUrl,
        expiresAt: updateData.expiresAt,
        shortCode: newShortCode,
      },
    });
  }
}
