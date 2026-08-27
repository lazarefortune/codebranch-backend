# API Contract - Common conventions

See [API_CONTRACT_INDEX.md](./API_CONTRACT_INDEX.md) for the full document set.

---

## 1) General conventions

### 1.1 Base URL
- All endpoints are prefixed with `/api/v1`
- Example local backend: `http://localhost:4000/api/v1`

### 1.2 Content type
- Requests with a body: `Content-Type: application/json`
- Responses: `application/json`

### 1.3 Authentication
- Access token: JWT sent in `Authorization` header
- Refresh token: httpOnly cookie

Header:
- `Authorization: Bearer <access_token>`

Cookie:
- `cb_refresh=<refresh_token>`

Notes:
- Access token is short-lived.
- Refresh token is longer-lived.
- `POST /auth/refresh` uses the `cb_refresh` cookie.

### 1.4 Timestamps
- ISO 8601 UTC: `YYYY-MM-DDTHH:MM:SS.sssZ`

### 1.5 IDs
- All IDs are opaque strings.

### 1.6 Standard error response
All non-2xx responses follow:

```json
{
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human readable message",
    "details": [
      { "field": "fieldName", "message": "What is wrong" }
    ],
    "requestId": "req_..."
  }
}
```

Notes:
- `details` is optional.
- `requestId` is always present.
- Validation errors use `code: "VALIDATION_ERROR"` and may include per-field `details`.

### 1.7 Rate limiting
- Global throttling exists.
- Auth endpoints have stricter limits.
- `429 RATE_LIMITED` may be returned.

### 1.8 Status codes used
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests
- 500 Internal Server Error

---

## 2) Core concepts

### 2.1 Public URL scheme
Public pages are reachable via:
- `https://codebranch.dev/{username}`

Public API retrieval is by username.

### 2.2 Page ownership
- Each user has exactly one page (1 user = 1 page).
- Authenticated users can only manage their own page and blocks.

### 2.3 Blocks model
A page contains ordered blocks.

Each block has:
- `type` in `header | text | link | separator | project | technologies`
- `order` as integer (`>= 0`)
- `data` as JSON object

### 2.4 Header rules
- Exactly one `header` block must exist per page.
- `header` block cannot be deleted.

### 2.5 Save model
Frontend can use:
- Granular block endpoints (`create/update/delete`)
- Bulk replace (`PUT /pages/{pageId}/blocks`) for explicit Save flows

### 2.6 Onboarding model
- Username is chosen before registration.
- On successful register, user and page are created atomically.
- Username availability must be checked before submitting the register form.
- On successful email verification, an access token is returned directly (user is logged in).

---

## 3) DTO shapes

### 3.1 User DTO
```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:05:00.000Z"
}
```

### 3.2 Page DTO (summary)
```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 3.3 Page DTO (detailed - owner or public)
```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "blocks": [
    {
      "id": "blk_1",
      "type": "header",
      "order": 0,
      "data": {
        "title": "Your Name",
        "jobTitle": "Your Job Title",
        "bio": null,
        "avatarUrl": null
      },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:00:00.000Z"
    }
  ],
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 3.4 Block DTO
```json
{
  "id": "blk_123",
  "type": "text",
  "order": 2,
  "data": { "text": "Hello" },
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:00:00.000Z"
}
```

### 3.5 Technology DTO
```json
{
  "id": "tec_1",
  "name": "React",
  "logoUrl": "https://cdn.example.com/t/react.png",
  "createdByUser": false,
  "createdAt": "2026-01-10T10:00:00.000Z"
}
```

---

## 4) Authorization summary

Public endpoints (no auth required):
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification-code`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `GET /api/v1/usernames/check`
- `GET /api/v1/public/pages/{username}`
- `GET /api/v1/health`

Authenticated endpoints (access token required):
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `DELETE /api/v1/me`
- `GET /api/v1/me/page`
- `PATCH /api/v1/me/page`
- `PATCH /api/v1/pages/{pageId}/username`
- `POST /api/v1/pages/{pageId}/blocks`
- `PATCH /api/v1/pages/{pageId}/blocks/{blockId}`
- `DELETE /api/v1/pages/{pageId}/blocks/{blockId}`
- `PUT /api/v1/pages/{pageId}/blocks`
- `GET /api/v1/technologies`
- `POST /api/v1/technologies`

Ownership rule:
- Users can only access or modify their own page and blocks.

---

## 5) General error codes

These codes are not specific to one domain; see each domain file for domain-specific codes.

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

End of document.
