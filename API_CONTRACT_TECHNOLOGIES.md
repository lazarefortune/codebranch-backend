# API Contract - Technologies API (authenticated)

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL, error envelope, and auth conventions.

---

## GET /api/v1/technologies?query=rea&page=1&limit=20

List technologies.

Query params:
- `query`: optional string filter on technology name
- `page`: optional, integer, default `1`, min `1`
- `limit`: optional, integer, default `20`, min `1`, max `100`

Response 200:
```json
{
  "items": [
    {
      "id": "tec_1",
      "name": "React",
      "logoUrl": "https://cdn.example.com/t/react.png",
      "createdByUser": false,
      "createdAt": "2026-01-10T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
}
```

---

## POST /api/v1/technologies

Create technology.

Request:
```json
{
  "name": "Laravel",
  "logoUrl": "https://cdn.example.com/t/laravel.png"
}
```

Response 201:
```json
{
  "technology": {
    "id": "tec_9",
    "name": "Laravel",
    "logoUrl": "https://cdn.example.com/t/laravel.png",
    "createdByUser": true,
    "createdAt": "2026-01-15T18:00:00.000Z"
  }
}
```

Errors:
- 409 `TECHNOLOGY_ALREADY_EXISTS`
- 400 `VALIDATION_ERROR`

---

## Validation summary

- `name`: required string, max 50 chars.
- `logoUrl`: optional, must be a valid URL if provided.
- Listing pagination: `page >= 1`, `1 <= limit <= 100`.

---

## Error codes

- `TECHNOLOGY_ALREADY_EXISTS`

---

End of document.
