const { config } = require('dotenv');
const { resolve } = require('node:path');
const { execSync } = require('node:child_process');

config({ path: resolve(__dirname, '../.env.test') });

execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: process.env,
});
