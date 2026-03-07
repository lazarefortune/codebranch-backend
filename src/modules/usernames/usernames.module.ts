import { Module } from '@nestjs/common';
import { UsernamesController } from './usernames.controller';
import { UsernamesService } from './usernames.service';

@Module({
  controllers: [UsernamesController],
  providers: [UsernamesService],
  exports: [UsernamesService],
})
export class UsernamesModule {}
