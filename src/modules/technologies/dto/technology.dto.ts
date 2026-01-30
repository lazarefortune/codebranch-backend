import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateTechnologyDto {
  @ApiProperty({
    example: 'Laravel',
    description: 'Technology name',
  })
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(50, { message: 'Name must be at most 50 characters' })
  name: string;

  @ApiPropertyOptional({
    example: 'codebranch-logo.png',
    description: 'Logo URL',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string;
}

export class TechnologyQueryDto {
  @ApiPropertyOptional({
    example: 'react',
    description: 'Search query',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;
}
