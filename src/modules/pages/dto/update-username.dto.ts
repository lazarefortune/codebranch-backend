import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateUsernameDto {
  @ApiProperty({
    example: 'lazarefortune',
    description: 'New username for the page',
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must be at most 30 characters long' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Username can only contain lowercase letters, numbers, hyphens and underscores',
  })
  username: string;
}
