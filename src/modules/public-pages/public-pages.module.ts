import { Module } from '@nestjs/common';
import { PublicPagesController } from './public-pages.controller';
import { PublicPagesService } from './public-pages.service';

@Module({
  controllers: [PublicPagesController],
  providers: [PublicPagesService],
  exports: [PublicPagesService],
})
export class PublicPagesModule {}
