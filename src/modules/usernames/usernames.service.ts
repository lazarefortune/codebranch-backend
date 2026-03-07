import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';

@Injectable()
export class UsernamesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a username is available
   */
  async checkAvailability(username: string) {
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
