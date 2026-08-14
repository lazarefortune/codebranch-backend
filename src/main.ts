import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppException } from './common/exceptions/app.exception';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints ?? {}).join(', '),
        }));
        return new AppException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Validation failed',
          details,
        );
      },
    }),
  );

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
