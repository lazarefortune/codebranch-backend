import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MailService } from '../../src/auth/mail/mail.service';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/prisma/prisma.service';
import { MailServiceMock } from './mail-service.mock';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  mail: MailServiceMock;
}

export async function createTestApp(): Promise<TestApp> {
  const mail = new MailServiceMock();

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailService)
    .useValue(mail)
    .compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma, mail };
}
