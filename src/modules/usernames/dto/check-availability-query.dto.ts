import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CheckAvailabilityQueryDto {
  @ApiProperty({
    example: 'john-doe',
    description: 'Username to check',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'username can only contain letters, numbers, dots, underscores and hyphens',
  })
  username: string;
}
