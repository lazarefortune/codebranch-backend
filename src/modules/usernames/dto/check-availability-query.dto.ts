import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CheckAvailabilityQueryDto {
  @ApiProperty({
    example: 'john-doe',
    description: 'Username to check',
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      'Username can only contain lowercase letters, numbers, hyphens and underscores',
  })
  username: string;
}
