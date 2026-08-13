# API Contract - Blocks API (authenticated)

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL, error envelope, and auth conventions.

Notes:
- All block endpoints use `{pageId}` for ownership verification.
- The authenticated user must own the page.

---

## POST /api/v1/pages/{pageId}/blocks

Create block.

Request:
```json
{
  "type": "text",
  "order": 2,
  "data": { "text": "Hello" }
}
```

Response 201:
```json
{
  "block": {
    "id": "blk_2",
    "type": "text",
    "order": 2,
    "data": { "text": "Hello" },
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
  }
}
```

Errors:
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`
- 422 `INVALID_BLOCK_TYPE`

---

## PATCH /api/v1/pages/{pageId}/blocks/{blockId}

Update block.

Request:
```json
{
  "order": 3,
  "data": { "text": "Updated" }
}
```

Response 200:
```json
{
  "block": {
    "id": "blk_2",
    "type": "text",
    "order": 3,
    "data": { "text": "Updated" },
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:10:00.000Z"
  }
}
```

Errors:
- 404 `BLOCK_NOT_FOUND`
- 403 `FORBIDDEN`

---

## DELETE /api/v1/pages/{pageId}/blocks/{blockId}

Response:
- 204 No Content

Errors:
- 404 `BLOCK_NOT_FOUND`
- 403 `FORBIDDEN`
- 409 `CANNOT_DELETE_HEADER`

---

## PUT /api/v1/pages/{pageId}/blocks

Bulk replace blocks (recommended for Save).

Notes:
- Replaces all blocks for the page in a single atomic operation.
- Must include exactly one `header` block.
- Order is persisted as provided.
- `clientKey` is used by the frontend to map response IDs back to local state. Not persisted.

Request:
```json
{
  "blocks": [
    {
      "clientKey": "tmp_1",
      "type": "header",
      "order": 0,
      "data": {
        "title": "Lazare Fortune",
        "jobTitle": "Developpeur full stack",
        "bio": "Optional",
        "avatarUrl": null
      }
    },
    {
      "clientKey": "tmp_2",
      "type": "text",
      "order": 1,
      "data": { "text": "Hello" }
    }
  ]
}
```

Response 200:
```json
{
  "blocks": [
    {
      "id": "blk_1",
      "clientKey": "tmp_1",
      "type": "header",
      "order": 0,
      "data": {
        "title": "Lazare Fortune",
        "jobTitle": "Developpeur full stack",
        "bio": "Optional",
        "avatarUrl": null
      },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    },
    {
      "id": "blk_2",
      "clientKey": "tmp_2",
      "type": "text",
      "order": 1,
      "data": { "text": "Hello" },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    }
  ]
}
```

Errors:
- 422 `HEADER_REQUIRED`
- 422 `MULTIPLE_HEADERS_NOT_ALLOWED`
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`

---

## Validation summary

- `type`: must be one of `header | text | link | separator | project | technologies`.
- `order`: integer >= 0.
- `data`: must be a non-null object.
- Bulk replace: must contain exactly one `header` block.

---

## Error codes

- `PAGE_NOT_FOUND`
- `BLOCK_NOT_FOUND`
- `INVALID_BLOCK_TYPE`
- `INVALID_BLOCK_DATA`
- `HEADER_REQUIRED`
- `MULTIPLE_HEADERS_NOT_ALLOWED`
- `CANNOT_DELETE_HEADER`
- `FORBIDDEN`

---

End of document.
