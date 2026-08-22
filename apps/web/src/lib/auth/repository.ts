import { prisma } from "@rotula-facil-pro/db";
import type { AuthRepository } from "./service";

export const prismaAuthRepository: AuthRepository = {
  async createUser(data) {
    return prisma.user.create({
      data
    });
  },
  async findUserByEmail(email) {
    return prisma.user.findUnique({
      where: {
        email
      }
    });
  },
  async createPasswordResetToken(data) {
    await prisma.passwordResetToken.create({
      data
    });
  }
};
