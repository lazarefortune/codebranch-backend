# API Contract - Public pages API (no auth)

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL and error envelope conventions.

---

## GET /api/v1/public/pages/{username}

Response 200:
```json
{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": true,
    "blocks": [
      {
        "id": "blk_1",
        "type": "header",
        "order": 0,
        "data": {
          "title": "Lazare Fortune",
          "jobTitle": "Developpeur full stack",
          "bio": "Optional",
          "avatarUrl": null
        },
        "createdAt": "2026-01-15T18:00:00.000Z",
        "updatedAt": "2026-01-15T18:00:00.000Z"
      }
    ],
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:10:00.000Z"
  }
}
```

Errors:
- 404 `PAGE_NOT_FOUND`
- 403 `PAGE_NOT_PUBLIC`

---

## Error codes

- `PAGE_NOT_FOUND`
- `PAGE_NOT_PUBLIC`

---

End of document.
