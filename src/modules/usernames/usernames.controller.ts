import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsernamesService } from './usernames.service';

@ApiTags('Usernames')
@ApiBearerAuth()
@Controller('usernames')
export class UsernamesController {
  constructor(private readonly usernamesService: UsernamesService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check username availability' })
  @ApiQuery({
    name: 'username',
    required: true,
    description: 'Username to check',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns availability status',
  })
  async checkAvailability(@Query('username') username: string) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      throw new BadRequestException('Username query parameter is required');
    }
    return this.usernamesService.checkAvailability(username);
  }
}
