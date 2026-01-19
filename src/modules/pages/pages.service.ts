import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CreatePageDto } from './dto';
import { nanoid } from 'nanoid';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all pages for the current user
   */
  async findAllByUser(userId: string) {
    const pages = await this.prisma.page.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { pages };
  }

  /**
   * Create a new page with auto-generated username and header block
   */
  async create(userId: string, dto: CreatePageDto) {
    // Generate unique username
    const username = await this.generateUniqueUsername();

    // Create page with mandatory header block
    const page = await this.prisma.page.create({
      data: {
        userId,
        username,
        isPublic: dto.isPublic ?? true,
        blocks: {
          create: {
            type: 'header',
            order: 0,
            data: {
              title: 'Your Name',
              jobTitle: 'Your Job Title',
              bio: null,
              avatarUrl: null,
            },
          },
        },
      },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      page: {
        id: page.id,
        username: page.username,
        isPublic: page.isPublic,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        blocks: page.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          data: block.data,
        })),
      },
    };
  }

  /**
   * Get a page with all its blocks
   */
  async findOne(userId: string, pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: {
        blocks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.userId !== userId) {
      throw new ForbiddenException('You do not have access to this page');
    }

    return {
      page: {
        id: page.id,
        username: page.username,
        isPublic: page.isPublic,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        blocks: page.blocks.map((block) => ({
          id: block.id,
          type: block.type,
          order: block.order,
          data: block.data,
        })),
      },
    };
  }

  /**
   * Delete a page and all its blocks
   */
  async delete(userId: string, pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.userId !== userId) {
      throw new ForbiddenException('You do not have access to this page');
    }

    await this.prisma.page.delete({
      where: { id: pageId },
    });
  }

  /**
   * Generate a unique username
   */
  private async generateUniqueUsername(): Promise<string> {
    let username = '';
    let exists = true;

    while (exists) {
      username = `user-${nanoid(8)}`;
      const existingPage = await this.prisma.page.findUnique({
        where: { username },
      });
      exists = !!existingPage;
    }

    return username;
  }
}
