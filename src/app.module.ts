import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { appConfig, databaseConfig, jwtConfig, mailConfig } from './config';
import { PrismaModule } from './common/prisma';
import { GlobalExceptionFilter } from './common/filters';
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { UsersModule } from './modules/users';
import { HealthModule } from './modules/health';
import { MailerModule } from './common/mailer';
import { PagesModule } from './modules/pages';
import { TechnologiesModule } from './modules/technologies';
import { UsernamesModule } from './modules/usernames';
import { PublicPagesModule } from './modules/public-pages';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100, 
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    PagesModule,
    UsersModule,
    HealthModule,
    MailerModule,
    TechnologiesModule,
    UsernamesModule,
    PublicPagesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global throttler guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
