# CodeBranch - Backend

**CodeBranch** est une application web permettant aux développeurs de centraliser leurs liens importants (GitHub, portfolio, blog, etc.) dans un espace simple, élégant et personnalisable.

Cette partie du projet correspond au **backend**, développé avec **NestJS** et **TypeScript**. Elle expose une API REST qui gère l’authentification JWT ainsi que la création et la consultation d’utilisateurs via PostgreSQL et TypeORM.

---

## Prérequis

- [Node.js](https://nodejs.org/) 18+ et [pnpm](https://pnpm.io/) installés localement
- Une instance PostgreSQL accessible (locale ou via Docker)

## Installation

```bash
pnpm install
```

## Configuration de l’environnement

Créez un fichier `.env` à la racine du projet en vous basant sur la configuration ci-dessous :

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=codebranch
JWT_SECRET=change-me
FRONT_URL=http://localhost:3000
```

> 💡 Vous pouvez également utiliser `docker-compose up -d` pour démarrer une base de données PostgreSQL prête à l’emploi.

## Lancer l’application

```bash
# compilation TypeScript et démarrage simple
pnpm start

# rechargement à chaud pour le développement
pnpm start:dev

# mode production (nécessite `pnpm build` au préalable)
pnpm build
pnpm start:prod
```

L’API est accessible sur `http://localhost:3000` par défaut.

## Structure du projet

```text
src/
├── app.module.ts         # Module racine qui instancie la configuration globale
├── main.ts               # Point d’entrée et configuration Nest (pipes, CORS…)
├── auth/                 # Gestion de l’authentification JWT
└── users/                # Création et récupération des utilisateurs
```

Les modules suivent la convention NestJS : chaque dossier contient un contrôleur (`*.controller.ts`), un service (`*.service.ts`) et les DTO/entités associés.

## Tests

```bash
# tests unitaires
pnpm test

# tests end-to-end
pnpm test:e2e

# couverture de tests
pnpm test:cov
```

## Ressources complémentaires

- [Documentation NestJS](https://docs.nestjs.com/)
- [Guide TypeORM](https://typeorm.io/)
- [Validation class-validator](https://github.com/typestack/class-validator)

