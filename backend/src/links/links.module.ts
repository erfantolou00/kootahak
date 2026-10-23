import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { LinksController } from "./links.controller";
import {
  GoRedirectController,
  RedirectController,
} from "./redirect.controller";
import { LinksService } from "./links.service";
import { VisitorIpMiddleware } from "./visitor-ip.middleware";
import { ShortCodeModule } from "../short-code/short-code.module";
import { PrismaModule } from "../prismaClient/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { BullMqModule } from "../bullmq/bullMq.module";

@Module({
  imports: [ShortCodeModule, PrismaModule, RedisModule, BullMqModule],
  controllers: [LinksController, RedirectController, GoRedirectController],
  providers: [LinksService],
})
export class LinksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(VisitorIpMiddleware).forRoutes(GoRedirectController);
  }
}
