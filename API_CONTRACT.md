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
- Each user has exactly one page (1 user = 1 page).
- Authenticated users can only manage their own page and blocks.

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

### 1.6 Onboarding model
- Username is chosen before registration.
- On successful register, user and page are created atomically.
- Username availability must be checked before submitting the register form.
- On successful email verification, an access token is returned directly (user is logged in).

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

### 2.2 Page DTO (summary)
```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 2.3 Page DTO (detailed — owner or public)
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

### 2.4 Block DTO
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

Notes:
- Username availability should be checked via `GET /api/v1/usernames/check` before submitting.
- User and page are created atomically. If username is taken at write time, registration fails.
- A verification code is sent to the provided email.
- User is not authenticated after this step. Authentication happens after email verification.

Request:
```json
{
  "email": "user@example.com",
  "password": "StrongPassword123!",
  "username": "johndoe"
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
- 409 `USERNAME_TAKEN`
- 400 `VALIDATION_ERROR`

### 3.2 Verify email
- `POST /api/v1/auth/verify-email`

Notes:
- On success, the user is authenticated directly.
- Sets cookie `cb_refresh`.
- Returns the user's page so the frontend can redirect immediately to the editor.

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
  "accessToken": "jwt_access_token",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:05:00.000Z"
  },
  "page": {
    "id": "pag_123",
    "username": "johndoe",
    "isPublic": true,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
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

Notes:
- Sets cookie `cb_refresh`.

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

Errors:
- 401 `INVALID_CREDENTIALS`
- 403 `EMAIL_NOT_VERIFIED`

### 3.5 Refresh session
- `POST /api/v1/auth/refresh`

Notes:
- No JSON body.
- Requires cookie `cb_refresh`.
- Rotates and resets `cb_refresh` cookie.

Response 200:
```json
{ "accessToken": "jwt_access_token" }
```

Errors:
- 401 `INVALID_REFRESH_TOKEN`

### 3.6 Logout
- `POST /api/v1/auth/logout`

Notes:
- Requires access token.
- No JSON body.
- Clears `cb_refresh` cookie.

Response:
- 204 No Content

### 3.7 Request password reset
- `POST /api/v1/auth/password/forgot`

Notes:
- Response is always 200 regardless of whether the email exists (anti-enumeration).

Request:
```json
{ "email": "user@example.com" }
```

Response 200:
```json
{ "status": "SENT" }
```

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

## 5) Username API

### 5.1 Check username availability
- `GET /api/v1/usernames/check?username=johndoe`
- Public endpoint — no authentication required.

Notes:
- Username is normalized to lowercase and trimmed before checking.
- When unavailable, suggestions are returned as convenience alternatives.

Response 200 — available:
```json
{
  "username": "johndoe",
  "available": true,
  "suggestions": []
}
```

Response 200 — taken:
```json
{
  "username": "johndoe",
  "available": false,
  "suggestions": ["john_doe", "johndoe_dev", "johndoe2026"]
}
```

### 5.2 Update username
- `PATCH /api/v1/pages/{pageId}/username`
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

## 6) Page API (authenticated)

Notes:
- In V1, each user has exactly one page, created atomically during registration.
- There is no endpoint to create or list pages. The page is retrieved directly via `GET /api/v1/me/page`.

### 6.1 Get my page (with blocks)
- `GET /api/v1/me/page`

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

### 6.2 Update page visibility
- `PATCH /api/v1/me/page`

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

Notes:
- All block endpoints use `{pageId}` for ownership verification.
- The authenticated user must own the page.

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
- 204 No Content

Errors:
- 404 `BLOCK_NOT_FOUND`
- 403 `FORBIDDEN`
- 409 `CANNOT_DELETE_HEADER`

### 8.4 Bulk replace blocks (recommended for Save)
- `PUT /api/v1/pages/{pageId}/blocks`

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

## 12) Validation summary

Auth:
- `email`: valid email format.
- `password`: min 8 chars, must include uppercase, lowercase, digit, and special character.
- `username` at register: 3-30 chars, lowercase letters, digits, `_`, `-` only.
- Verification code: exactly 6 numeric characters.

Page:
- `isPublic`: optional boolean, defaults to `true`.
- `username` update: 3-30 chars, lowercase letters, digits, `_`, `-` only.

Blocks:
- `type`: must be one of `header | text | link | separator | project | technologies`.
- `order`: integer >= 0.
- `data`: must be a non-null object.
- Bulk replace: must contain exactly one `header` block.

Technologies:
- `name`: required string, max 50 chars.
- `logoUrl`: optional, must be a valid URL if provided.
- Listing pagination: `page >= 1`, `1 <= limit <= 100`.

---

## 13) Error codes

Auth:
- `EMAIL_ALREADY_EXISTS`
- `USERNAME_TAKEN`
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

Pages / Blocks:
- `PAGE_NOT_FOUND`
- `PAGE_NOT_PUBLIC`
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