# API Contract - CodeBranch (V1)

This document set defines the HTTP API contract for CodeBranch V1.
ASCII only.

The contract is split by domain:

- [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) - base URL, auth, error envelope, timestamps/IDs, DTO shapes, authorization summary
- [API_CONTRACT_AUTH.md](./API_CONTRACT_AUTH.md) - register, verify email, login, refresh, logout, password reset
- [API_CONTRACT_USERS.md](./API_CONTRACT_USERS.md) - current user (`/me`), account deletion
- [API_CONTRACT_PAGES.md](./API_CONTRACT_PAGES.md) - username availability/update, page retrieval/visibility
- [API_CONTRACT_PUBLIC.md](./API_CONTRACT_PUBLIC.md) - public page retrieval (no auth)
- [API_CONTRACT_BLOCKS.md](./API_CONTRACT_BLOCKS.md) - block CRUD and bulk replace
- [API_CONTRACT_TECHNOLOGIES.md](./API_CONTRACT_TECHNOLOGIES.md) - technologies list/create
- [API_CONTRACT_HEALTH.md](./API_CONTRACT_HEALTH.md) - health check

Read `API_CONTRACT_COMMON.md` first - every other file assumes its conventions (base URL, error envelope, auth headers, DTO shapes).

---

End of document.
