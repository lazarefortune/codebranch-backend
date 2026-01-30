import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '@/common/decorators';
import { PublicPagesService } from './public-pages.service';

@ApiTags('Public Pages')
@Controller('public/pages')
export class PublicPagesController {
  constructor(private readonly publicPagesService: PublicPagesService) {}

  @Get(':username')
  @Public()
  @ApiOperation({ summary: 'Get public page by username' })
  @ApiParam({ name: 'username', description: 'Page username' })
  @ApiResponse({
    status: 200,
    description: 'Returns public page with blocks',
  })
  @ApiResponse({
    status: 403,
    description: 'Page is not public',
  })
  @ApiResponse({
    status: 404,
    description: 'Page not found',
  })
  async findByUsername(@Param('username') username: string) {
    return this.publicPagesService.findByUsername(username);
  }
}
