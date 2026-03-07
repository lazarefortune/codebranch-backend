import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsernamesService } from './usernames.service';
import { CheckAvailabilityQueryDto } from './dto';

@ApiTags('Usernames')
@ApiBearerAuth()
@Controller('usernames')
export class UsernamesController {
  constructor(private readonly usernamesService: UsernamesService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check username availability' })
  @ApiResponse({
    status: 200,
    description: 'Returns availability status',
  })
  async checkAvailability(@Query() query: CheckAvailabilityQueryDto) {
    return this.usernamesService.checkAvailability(query.username);
  }
}
