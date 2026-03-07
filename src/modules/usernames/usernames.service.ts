import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CustomException } from '@/common/exceptions/custom.exception';

@Injectable()
export class UsernamesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a username is available
   */
  async checkAvailability(username: string) {
    if (typeof username !== 'string' || username.trim().length === 0) {
      throw new CustomException({
        code: 'INVALID_USERNAME',
        message: 'username must be a non-empty string',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const normalizedUsername = username.toLowerCase().trim();

    const existingPage = await this.prisma.page.findUnique({
      where: { username: normalizedUsername },
    });

    return {
      username: normalizedUsername,
      available: !existingPage,
    };
  }
}
