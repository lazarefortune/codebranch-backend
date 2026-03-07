import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import {
  PageNotFoundException,
  PageNotPublicException,
} from '@/modules/pages/exceptions';

@Injectable()
export class PublicPagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get a public page by username
   */
  async findByUsername(username: string) {
    const page = await this.prisma.page.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      throw new PageNotFoundException();
    }

    if (!page.isPublic) {
      throw new PageNotPublicException();
    }

    return {
      page: {
        id: page.id,
        username: page.username,
        isPublic: page.isPublic,
        blocks: page.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          data: block.data,
          createdAt: block.createdAt,
          updatedAt: block.updatedAt,
        })),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
    };
  }
}
