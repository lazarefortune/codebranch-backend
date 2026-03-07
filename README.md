## Database (MySQL only)

This backend supports MySQL only.

`DATABASE_URL` must start with `mysql://`.

Quick start with Docker:

```bash
cp .env.example .env
docker compose up -d db
pnpm prisma db push
pnpm prisma generate
```

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Swagger

http://localhost:<PORT>/api/docs