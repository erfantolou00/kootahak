import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prismaClient/prisma.service";
import { LoginDto, RegisterDto } from "../auth/dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: RegisterDto) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const newUserData = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
    };

    try {
      // Rely on the DB's unique constraint instead of a findUnique check first,
      // which avoids a race condition where two requests could pass the check at once.
      const newUser = await this.prisma.user.create({
        data: newUserData,
        omit: { password: true },
      });

      return newUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("کاربر از قبل وجود دارد.");
      }

      throw error;
    }
  }

  async validateUser(data: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException("ایمیل یا رمز عبور اشتباه است.");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("ایمیل یا رمز عبور اشتباه است.");
    }

    return { id: user.id, email: user.email, name: user.name };
  }
}
