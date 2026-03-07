import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CreateTechnologyDto, TechnologyQueryDto } from './dto';
import { TechnologyAlreadyExistsException } from './exceptions';

@Injectable()
export class TechnologiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List technologies with optional search and pagination
   */
  async findAll(query: TechnologyQueryDto) {
    const { query: searchQuery, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = searchQuery
      ? {
          name: {
            contains: searchQuery,
          },
        }
      : {};

    const [items, totalItems] = await Promise.all([
      this.prisma.technology.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          logoUrl: true,
          createdByUser: true,
          createdAt: true,
        },
      }),
      this.prisma.technology.count({ where }),
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
   * Create a new technology
   */
  async create(dto: CreateTechnologyDto) {
    // Check if technology already exists
    const existing = await this.prisma.technology.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new TechnologyAlreadyExistsException();
    }

    const technology = await this.prisma.technology.create({
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        createdByUser: true,
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        createdByUser: true,
        createdAt: true,
      },
    });

    return { technology };
  }
}
