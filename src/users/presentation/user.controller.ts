import { Controller, Get } from '@nestjs/common';
import { UserService } from '../application/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }
}
