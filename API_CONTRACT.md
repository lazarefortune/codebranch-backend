# API Contract - CodeBranch (V1)

This document defines the HTTP API contract for CodeBranch V1 based on the current backend implementation.
ASCII only.

---

## 0) General conventions

### 0.1 Base URL
- All endpoints are prefixed with `/api/v1`
- Example local backend: `http://localhost:4000/api/v1`

### 0.2 Content type
- Requests with a body: `Content-Type: application/json`
- Responses: `application/json`

### 0.3 Authentication
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

### 0.4 Timestamps
- ISO 8601 UTC: `YYYY-MM-DDTHH:MM:SS.sssZ`

### 0.5 IDs
- All IDs are opaque strings.

### 0.6 Standard error response
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

### 0.7 Rate limiting
- Global throttling exists.
- Auth endpoints have stricter limits.
- `429 RATE_LIMITED` may be returned.

### 0.8 Status codes used
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

## 1) Core concepts

### 1.1 Public URL scheme
Public pages are reachable via:
- `https://codebranch.dev/{username}`

Public API retrieval is by username.

### 1.2 Page ownership
- Authenticated users can only manage their own pages and blocks.

### 1.3 Blocks model
A page contains ordered blocks.

Each block has:
- `type` in `header | text | link | separator | project | technologies`
- `order` as integer (`>= 0`)
- `data` as JSON object

### 1.4 Header rules
- Exactly one `header` block must exist per page.
- `header` block cannot be deleted.

### 1.5 Save model
Frontend can use:
- Granular block endpoints (`create/update/delete`)
- Bulk replace (`PUT /pages/{pageId}/blocks`) for explicit Save flows

---

## 2) DTO shapes

### 2.1 User DTO
```json
{
  "id": "usr_123",
  "email": "user@example.com",
  "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:05:00.000Z"
}
```

### 2.2 Page DTO (list item)
```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 2.3 Page DTO (detailed owner/public)
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
      }
    }
  ],
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 2.4 Block DTO (single block endpoints)
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

### 2.5 Technology DTO
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

## 3) Auth API

### 3.1 Register
- `POST /api/v1/auth/register`

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Response 201:
```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "emailVerifiedAt": null,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
  },
  "next": { "action": "VERIFY_EMAIL_CODE" }
}
```

Errors:
- 409 `EMAIL_ALREADY_EXISTS`
- 400 `VALIDATION_ERROR`

### 3.2 Verify email
- `POST /api/v1/auth/verify-email`

Request:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

Response 200:
```json
{
  "status": "VERIFIED",
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
- 400 `INVALID_CODE`
- 400 `CODE_EXPIRED`
- 404 `USER_NOT_FOUND`

### 3.3 Resend verification code
- `POST /api/v1/auth/resend-verification-code`

Request:
```json
{ "email": "user@example.com" }
```

Response 200:
```json
{ "status": "SENT" }
```

Errors:
- 404 `USER_NOT_FOUND`
- 409 `ALREADY_VERIFIED`
- 429 `RATE_LIMITED`

### 3.4 Login
- `POST /api/v1/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}
```

Response 200:
```json
{
  "accessToken": "jwt_access_token",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:05:00.000Z"
  }
}
```

Notes:
- Sets cookie `cb_refresh`.

Errors:
- 401 `INVALID_CREDENTIALS`
- 403 `EMAIL_NOT_VERIFIED`

### 3.5 Refresh session
- `POST /api/v1/auth/refresh`

Request:
- No JSON body.
- Requires cookie `cb_refresh`.

Response 200:
```json
{ "accessToken": "jwt_access_token" }
```

Notes:
- Also rotates and resets `cb_refresh` cookie.

Errors:
- 401 `INVALID_REFRESH_TOKEN`

### 3.6 Logout
- `POST /api/v1/auth/logout`

Request:
- Requires access token.
- No JSON body.

Response:
- 204 no content

Notes:
- Clears `cb_refresh` cookie.

### 3.7 Request password reset
- `POST /api/v1/auth/password/forgot`

Request:
```json
{ "email": "user@example.com" }
```

Response 200:
```json
{ "status": "SENT" }
```

Notes:
- Response is always 200 (anti-enumeration).

### 3.8 Reset password
- `POST /api/v1/auth/password/reset`

Request:
```json
{
  "token": "reset_token_from_link",
  "newPassword": "NewStrongPassword123!"
}
```

Response 200:
```json
{ "status": "RESET" }
```

Errors:
- 400 `TOKEN_EXPIRED`
- 400 `TOKEN_INVALID`

---

## 4) Users API (authenticated)

### 4.1 Get current user
- `GET /api/v1/me`

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

### 4.2 Delete account
- `DELETE /api/v1/me`

Request:
```json
{ "password": "CurrentPassword123!" }
```

Response:
- 204 no content

Errors:
- 401 `UNAUTHORIZED`
- 401 `INVALID_CREDENTIALS`

---

## 5) Username API

### 5.1 Check username availability
- `GET /api/v1/usernames/check?username=lazarefortune`

Response 200:
```json
{
  "username": "lazarefortune",
  "available": true
}
```

Notes:
- Username is normalized to lowercase and trimmed.

### 5.2 Set/update username for a page
- `PATCH /api/v1/pages/{pageId}/username`

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

## 6) Pages API (authenticated)

### 6.1 List my pages
- `GET /api/v1/pages?page=1&limit=20`

Query params:
- `page`: optional, integer, default `1`, min `1`
- `limit`: optional, integer, default `20`, min `1`, max `100`

Response 200:
```json
{
  "items": [
    {
      "id": "pag_123",
      "username": "lazarefortune",
      "isPublic": true,
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### 6.2 Create page
- `POST /api/v1/pages`

Request:
```json
{ "isPublic": true }
```

Response 201:
```json
{
  "page": {
    "id": "pag_123",
    "username": "user-a1b2c3d4",
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
        }
      }
    ],
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
  }
}
```

Notes:
- Username is auto-generated by backend.
- Initial mandatory `header` block is created automatically.

### 6.3 Get my page (with blocks)
- `GET /api/v1/pages/{pageId}`

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
        }
      }
    ],
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:10:00.000Z"
  }
}
```

Errors:
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`

### 6.4 Delete page
- `DELETE /api/v1/pages/{pageId}`

Response:
- 204 no content

Errors:
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`

---

## 7) Public pages API (no auth)

### 7.1 Get public page by username
- `GET /api/v1/public/pages/{username}`

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

## 8) Blocks API (authenticated)

### 8.1 Create block
- `POST /api/v1/pages/{pageId}/blocks`

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

### 8.2 Update block
- `PATCH /api/v1/pages/{pageId}/blocks/{blockId}`

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

### 8.3 Delete block
- `DELETE /api/v1/pages/{pageId}/blocks/{blockId}`

Response:
- 204 no content

Errors:
- 404 `BLOCK_NOT_FOUND`
- 403 `FORBIDDEN`
- 409 `CANNOT_DELETE_HEADER`

### 8.4 Bulk replace blocks (recommended for Save)
- `PUT /api/v1/pages/{pageId}/blocks`

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
      "type": "text",
      "order": 1,
      "data": { "text": "Hello" },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    }
  ]
}
```

Rules:
- Must contain exactly one `header` block.
- Order is persisted as provided.

Errors:
- 422 `HEADER_REQUIRED`
- 422 `MULTIPLE_HEADERS_NOT_ALLOWED`
- 404 `PAGE_NOT_FOUND`
- 403 `FORBIDDEN`

---

## 9) Technologies API (authenticated)

### 9.1 List technologies
- `GET /api/v1/technologies?query=rea&page=1&limit=20`

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

### 9.2 Create technology
- `POST /api/v1/technologies`

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

## 10) Health

### 10.1 Health check
- `GET /api/v1/health`

Response 200:
```json
{ "status": "ok" }
```

---

## 11) Authorization summary

Public endpoints:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification-code`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `GET /api/v1/public/pages/{username}`
- `GET /api/v1/health`

Authenticated endpoints (access token required):
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `DELETE /api/v1/me`
- `GET/POST/DELETE /api/v1/pages...`
- `PATCH /api/v1/pages/{pageId}/username`
- `POST/PATCH/DELETE/PUT /api/v1/pages/{pageId}/blocks...`
- `GET/POST /api/v1/technologies`
- `GET /api/v1/usernames/check`

Ownership rule:
- Users can only access/modify their own pages and blocks.

---

## 12) Validation summary

Auth:
- Email must be valid format.
- Password must be at least 8 chars and include upper/lower/digit/special.
- Verify code must be 6 chars.

Pages:
- `isPublic` is optional boolean at creation.
- Username update accepts 3-30 chars: lowercase letters, digits, `_`, `-`.
- Page listing pagination: `page >= 1`, `1 <= limit <= 100`.

Blocks:
- `type` must be one of supported enum values.
- `order` must be integer >= 0.
- `data` must be an object.
- Bulk replace requires exactly one header.

Technologies:
- `name`: required string, max 50.
- `logoUrl`: optional valid URL.
- Technologies listing pagination: `page >= 1`, `1 <= limit <= 100`.

---

## 13) Error codes

Auth:
- `EMAIL_ALREADY_EXISTS`
- `INVALID_CREDENTIALS`
- `EMAIL_NOT_VERIFIED`
- `INVALID_CODE`
- `CODE_EXPIRED`
- `INVALID_REFRESH_TOKEN`
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `ALREADY_VERIFIED`

Users:
- `USER_NOT_FOUND`

Pages/Blocks:
- `PAGE_NOT_FOUND`
- `PAGE_NOT_PUBLIC`
- `USERNAME_TAKEN`
- `BLOCK_NOT_FOUND`
- `INVALID_BLOCK_TYPE`
- `INVALID_BLOCK_DATA`
- `HEADER_REQUIRED`
- `MULTIPLE_HEADERS_NOT_ALLOWED`
- `CANNOT_DELETE_HEADER`

Technologies:
- `TECHNOLOGY_ALREADY_EXISTS`

General:
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

---

End of document.
