import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CreatePageDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the page is public',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
