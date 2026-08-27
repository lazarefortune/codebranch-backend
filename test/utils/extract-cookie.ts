import type { Response } from 'supertest';

export function extractCookie(res: Response, name: string): string {
  // @types/superagent types headers as { [k: string]: string }, but Node's
  // http actually returns an array for repeatable headers like Set-Cookie.
  const setCookie = res.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  const found = setCookie?.find((cookie) => cookie.startsWith(`${name}=`));
  if (!found) {
    throw new Error(`Cookie "${name}" not found in response`);
  }
  return found.split(';')[0];
}
