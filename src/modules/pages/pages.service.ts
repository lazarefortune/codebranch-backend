import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma';
import { ForbiddenException } from '@/common/exceptions';
import {
  PageNotFoundException,
  UsernameTakenException,
  BlockNotFoundException,
  InvalidBlockTypeException,
  HeaderRequiredException,
  MultipleHeadersNotAllowedException,
  CannotDeleteHeaderException,
} from './exceptions';
import {
  CreatePageDto,
  PaginationQueryDto,
  UpdateUsernameDto,
  CreateBlockDto,
  UpdateBlockDto,
  BulkReplaceBlocksDto,
  BlockType,
} from './dto';
import { nanoid } from 'nanoid';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PRIVATE HELPERS - Guard clauses (fail fast)
  // ============================================

  /**
   * Get page or throw PageNotFoundException
   */
  private async getPageOrFail(pageId: string) {
    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page) throw new PageNotFoundException();
    return page;
  }

  /**
   * Get page with blocks or throw PageNotFoundException
   */
  private async getPageWithBlocksOrFail(pageId: string) {
    const page = await this.prisma.page.findUnique({
      where: { id: pageId },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    if (!page) throw new PageNotFoundException();
    return page;
  }

  /**
   * Verify user owns the page or throw ForbiddenException
   */
  private assertOwnership(page: { userId: string }, userId: string) {
    if (page.userId !== userId) throw new ForbiddenException();
  }

  /**
   * Get block or throw BlockNotFoundException
   */
  private async getBlockOrFail(blockId: string, pageId: string) {
    const block = await this.prisma.block.findUnique({
      where: { id: blockId },
    });
    if (!block || block.pageId !== pageId) throw new BlockNotFoundException();
    return block;
  }

  /**
   * Format page response (DRY)
   */
  private formatPageResponse(page: {
    id: string;
    username: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    blocks: { id: string; type: string; order: number; data: unknown }[];
  }) {
    return {
      page: {
        id: page.id,
        username: page.username,
        isPublic: page.isPublic,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        blocks: page.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          order: b.order,
          data: b.data,
        })),
      },
    };
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * List all pages for the current user with pagination
   */
  async findAllByUser(userId: string, query: PaginationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      this.prisma.page.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.page.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    };
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
      include: { blocks: { orderBy: { order: 'asc' } } },
    });

    return this.formatPageResponse(page);
  }

  /**
   * Get a page with all its blocks
   */
  async findOne(userId: string, pageId: string) {
    const page = await this.getPageWithBlocksOrFail(pageId);
    this.assertOwnership(page, userId);
    return this.formatPageResponse(page);
  }

  /**
   * Delete a page and all its blocks
   */
  async delete(userId: string, pageId: string) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);
    await this.prisma.page.delete({ where: { id: pageId } });
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

  /**
   * Update page username
   */
  async updateUsername(userId: string, pageId: string, dto: UpdateUsernameDto) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);

    const normalizedUsername = dto.username.toLowerCase().trim();
    const existingPage = await this.prisma.page.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingPage && existingPage.id !== pageId)
      throw new UsernameTakenException();

    const updatedPage = await this.prisma.page.update({
      where: { id: pageId },
      data: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { page: updatedPage };
  }

  // ============================================
  // BLOCKS METHODS
  // ============================================

  /**
   * Create a new block
   */
  async createBlock(userId: string, pageId: string, dto: CreateBlockDto) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);

    if (!Object.values(BlockType).includes(dto.type)) {
      throw new InvalidBlockTypeException();
    }

    const block = await this.prisma.block.create({
      data: {
        pageId,
        type: dto.type,
        order: dto.order,
        data: dto.data as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        type: true,
        order: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { block };
  }

  /**
   * Update a block
   */
  async updateBlock(
    userId: string,
    pageId: string,
    blockId: string,
    dto: UpdateBlockDto,
  ) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);
    await this.getBlockOrFail(blockId, pageId);

    const updatedBlock = await this.prisma.block.update({
      where: { id: blockId },
      data: {
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.data !== undefined && {
          data: dto.data as Prisma.InputJsonValue,
        }),
      },
      select: {
        id: true,
        type: true,
        order: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { block: updatedBlock };
  }

  /**
   * Delete a block
   */
  async deleteBlock(userId: string, pageId: string, blockId: string) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);
    const block = await this.getBlockOrFail(blockId, pageId);

    if (block.type === 'header') throw new CannotDeleteHeaderException();

    await this.prisma.block.delete({ where: { id: blockId } });
  }

  /**
   * Bulk replace all blocks
   */
  async bulkReplaceBlocks(
    userId: string,
    pageId: string,
    dto: BulkReplaceBlocksDto,
  ) {
    const page = await this.getPageOrFail(pageId);
    this.assertOwnership(page, userId);

    // Validate: exactly one header block
    const headerCount = dto.blocks.filter(
      (b) => b.type === BlockType.HEADER,
    ).length;
    if (headerCount === 0) throw new HeaderRequiredException();
    if (headerCount > 1) throw new MultipleHeadersNotAllowedException();

    // Delete all existing blocks and create new ones in a transaction
    const blocks = await this.prisma.$transaction(async (tx) => {
      // Delete all existing blocks
      await tx.block.deleteMany({
        where: { pageId },
      });

      // Create new blocks sequentially to avoid concurrent transaction issues
      const createdBlocks = [];
      for (const blockData of dto.blocks) {
        const block = await tx.block.create({
          data: {
            pageId,
            type: blockData.type,
            order: blockData.order,
            data: blockData.data as Prisma.InputJsonValue,
          },
          select: {
            id: true,
            type: true,
            order: true,
            data: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        createdBlocks.push(block);
      }

      return createdBlocks;
    });

    return { blocks };
  }
}
