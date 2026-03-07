import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '@/common/prisma';
import { InvalidCredentialsException } from '@/modules/auth/exceptions';
import { UserNotFoundException } from './exceptions';
import { DeleteAccountDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UserNotFoundException();
    }

    return { user };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    // Delete user (cascade will delete related data)
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
