import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators';
import { PagesService } from './pages.service';
import {
  CreatePageDto,
  PaginationQueryDto,
  UpdateUsernameDto,
  CreateBlockDto,
  UpdateBlockDto,
  BulkReplaceBlocksDto,
} from './dto';

@ApiTags('Pages')
@ApiBearerAuth()
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all pages for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of pages with pagination',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.pagesService.findAllByUser(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new page' })
  @ApiResponse({
    status: 201,
    description: 'Page created successfully with header block',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePageDto,
  ) {
    return this.pagesService.create(userId, dto);
  }

  @Get(':pageId')
  @ApiOperation({ summary: 'Get a page with all blocks' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns page with blocks',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pagesService.findOne(userId, pageId);
  }

  @Delete(':pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiResponse({
    status: 204,
    description: 'Page deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pagesService.delete(userId, pageId);
  }

  // ============================================
  // USERNAME ENDPOINT
  // ============================================

  @Patch(':pageId/username')
  @ApiOperation({ summary: 'Update page username' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiResponse({
    status: 200,
    description: 'Username updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Username already taken',
  })
  async updateUsername(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdateUsernameDto,
  ) {
    return this.pagesService.updateUsername(userId, pageId, dto);
  }

  // ============================================
  // BLOCKS ENDPOINTS
  // ============================================

  @Post(':pageId/blocks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new block' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiResponse({
    status: 201,
    description: 'Block created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid block type or data',
  })
  async createBlock(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: CreateBlockDto,
  ) {
    return this.pagesService.createBlock(userId, pageId, dto);
  }

  @Patch(':pageId/blocks/:blockId')
  @ApiOperation({ summary: 'Update a block' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiParam({ name: 'blockId', description: 'Block ID' })
  @ApiResponse({
    status: 200,
    description: 'Block updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Block not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid block data',
  })
  async updateBlock(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.pagesService.updateBlock(userId, pageId, blockId, dto);
  }

  @Delete(':pageId/blocks/:blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a block' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiParam({ name: 'blockId', description: 'Block ID' })
  @ApiResponse({
    status: 204,
    description: 'Block deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Block not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete header block',
  })
  async deleteBlock(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.pagesService.deleteBlock(userId, pageId, blockId);
  }

  @Put(':pageId/blocks')
  @ApiOperation({ summary: 'Bulk replace all blocks' })
  @ApiParam({ name: 'pageId', description: 'Page ID' })
  @ApiResponse({
    status: 200,
    description: 'Blocks replaced successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your page',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid blocks (missing header, multiple headers, etc.)',
  })
  async bulkReplaceBlocks(
    @CurrentUser('id') userId: string,
    @Param('pageId') pageId: string,
    @Body() dto: BulkReplaceBlocksDto,
  ) {
    return this.pagesService.bulkReplaceBlocks(userId, pageId, dto);
  }
}
