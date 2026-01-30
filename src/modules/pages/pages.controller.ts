import {
  Controller,
  Get,
  Post,
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
import { CreatePageDto, PaginationQueryDto } from './dto';

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
}
