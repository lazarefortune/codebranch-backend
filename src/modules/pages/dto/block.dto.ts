import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsObject,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';

export enum BlockType {
  HEADER = 'header',
  TEXT = 'text',
  LINK = 'link',
  SEPARATOR = 'separator',
  PROJECT = 'project',
  TECHNOLOGIES = 'technologies',
}

export class CreateBlockDto {
  @ApiProperty({
    enum: BlockType,
    example: 'text',
    description: 'Block type',
  })
  @IsEnum(BlockType, { message: 'Invalid block type' })
  type: BlockType;

  @ApiProperty({
    example: 2,
    description: 'Block order/position',
  })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    example: { text: 'Hello world' },
    description: 'Block data (varies by type)',
  })
  @IsObject()
  data: Record<string, unknown>;
}

export class UpdateBlockDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'New block order/position',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    example: { text: 'Updated text' },
    description: 'Updated block data',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class BulkBlockDto {
  @ApiPropertyOptional({
    example: 'tmp_1',
    description: 'Client-side temporary key for mapping',
  })
  @IsOptional()
  @IsString()
  clientKey?: string;

  @ApiProperty({
    enum: BlockType,
    example: 'text',
    description: 'Block type',
  })
  @IsEnum(BlockType, { message: 'Invalid block type' })
  type: BlockType;

  @ApiProperty({
    example: 1,
    description: 'Block order/position',
  })
  @IsInt()
  @Min(0)
  order: number;

  @ApiProperty({
    example: { text: 'Hello world' },
    description: 'Block data (varies by type)',
  })
  @IsObject()
  data: Record<string, unknown>;
}

export class BulkReplaceBlocksDto {
  @ApiProperty({
    type: [BulkBlockDto],
    description: 'Array of blocks to replace all existing blocks',
  })
  blocks: BulkBlockDto[];
}
