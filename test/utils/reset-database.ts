import { PrismaService } from '../../src/prisma/prisma.service';

const TABLES = [
  'RefreshToken',
  'EmailVerificationCode',
  'PasswordResetToken',
  'Page',
  'User',
] as const;

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // SET FOREIGN_KEY_CHECKS is session-scoped: it must run on the same
  // connection as the TRUNCATEs, which $transaction guarantees (a pooled
  // connection could otherwise serve each statement independently).
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of TABLES) {
      await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
    }
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
  });
}
