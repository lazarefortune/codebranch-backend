import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailService } from './mail/mail.service';
import { TokensService } from './tokens/tokens.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // expiresIn's type only accepts the `ms` package's StringValue union;
          // JWT_ACCESS_TOKEN_TTL is a plain validated env string (e.g. "15m").
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresIn: config.getOrThrow<string>('JWT_ACCESS_TOKEN_TTL') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, TokensService, JwtStrategy],
})
export class AuthModule {}
