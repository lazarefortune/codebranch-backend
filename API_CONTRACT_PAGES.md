# API Contract - Pages API (username + page, authenticated)

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL, error envelope, and auth conventions.

Notes:
- In V1, each user has exactly one page, created atomically during registration.
- There is no endpoint to create or list pages. The page is retrieved directly via `GET /api/v1/me/page`.

---

## Username API

### GET /api/v1/usernames/check?username=johndoe
- Public endpoint - no authentication required.

Notes:
- Username is normalized to lowercase and trimmed before checking.
- When unavailable, suggestions are returned as convenience alternatives.

Response 200 - available:
```json
{
  "username": "johndoe",
  "available": true,
  "suggestions": []
}
```

Response 200 - taken:
```json
{
  "username": "johndoe",
  "available": false,
  "suggestions": ["john_doe", "johndoe_dev", "johndoe2026"]
}
```

### PATCH /api/v1/pages/{pageId}/username
- Authenticated. Owner only.

Notes:
- Can be used from the dashboard to change the page's username after registration.
- Username availability is checked at write time.

Request:
```json
{ "username": "lazarefortune" }
```

Response 200:
```json
{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": true,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:10:00.000Z"
  }
}
```

Errors:
- 409 `USERNAME_TAKEN`
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`

---

## Page API

### GET /api/v1/me/page

Get my page (with blocks).

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
- 401 `UNAUTHORIZED`

### PATCH /api/v1/me/page

Update page visibility.

Request:
```json
{ "isPublic": false }
```

Response 200:
```json
{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": false,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:15:00.000Z"
  }
}
```

Errors:
- 401 `UNAUTHORIZED`

---

## Validation summary

- `isPublic`: optional boolean, defaults to `true`.
- `username` update: 3-30 chars, lowercase letters, digits, `_`, `-` only.

---

## Error codes

- `USERNAME_TAKEN`
- `PAGE_NOT_FOUND`
- `FORBIDDEN`
- `UNAUTHORIZED`

---

End of document.
