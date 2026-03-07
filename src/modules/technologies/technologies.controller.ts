import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { TechnologiesService } from './technologies.service';
import { CreateTechnologyDto, TechnologyQueryDto } from './dto';

@ApiTags('Technologies')
@ApiBearerAuth()
@Controller('technologies')
export class TechnologiesController {
  constructor(private readonly technologiesService: TechnologiesService) {}

  @Get()
  @ApiOperation({ summary: 'List technologies' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of technologies with pagination',
  })
  async findAll(@Query() query: TechnologyQueryDto) {
    return this.technologiesService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new technology' })
  @ApiResponse({
    status: 201,
    description: 'Technology created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Technology already exists',
  })
  async create(@Body() dto: CreateTechnologyDto) {
    return this.technologiesService.create(dto);
  }
}
