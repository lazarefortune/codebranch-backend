# API Contract - Users API (authenticated)

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL, error envelope, and auth conventions.

---

## GET /api/v1/me

Response 200:
```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:05:00.000Z"
  }
}
```

Errors:
- 401 `UNAUTHORIZED`

---

## DELETE /api/v1/me

Notes:
- Also deletes the user's page and all associated blocks (cascade).

Request:
```json
{ "password": "CurrentPassword123!" }
```

Response:
- 204 No Content

Errors:
- 401 `UNAUTHORIZED`
- 401 `INVALID_CREDENTIALS`

---

## Error codes

- `USER_NOT_FOUND`

---

End of document.
