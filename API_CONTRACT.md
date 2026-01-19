# API_CONTRACT.md - CodeBranch (V1)

This document defines the HTTP API contract for CodeBranch V1.
It covers all V1 features derived from the MCD and PRD.
ASCII only.

---

## 0) General conventions

### 0.1 Base URL

* All endpoints are prefixed with: `/api/v1`
* Example local backend: `http://localhost:3001/api/v1`

### 0.2 Content type

* Requests with body: `Content-Type: application/json`
* Responses: `application/json`

### 0.3 Authentication

* Access token: JWT, sent via header
* Refresh token: httpOnly cookie

Header:

* `Authorization: Bearer <access_token>`

Cookie:

* `cb_refresh=<refresh_token>`

Notes:

* Access token is short-lived.
* Refresh token is longer-lived.
* When access token expires, frontend calls refresh endpoint.

### 0.4 Timestamps

* ISO 8601 UTC: `YYYY-MM-DDTHH:MM:SS.sssZ`

### 0.5 IDs

* All `id` values are opaque strings (UUID or similar).

### 0.6 Errors (standard format)

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

* `details` is optional.
* `requestId` is always present.

### 0.7 Rate limiting

Auth endpoints are rate limited.

* 429 response code may be returned.
* Optional header: `Retry-After: <seconds>`

### 0.8 Status codes used

* 200 OK
* 201 Created
* 204 No Content
* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 409 Conflict
* 422 Unprocessable Entity
* 429 Too Many Requests

---

## 1) Core concepts

### 1.1 Public URL scheme

Public pages are reachable via:

* `https://codebranch.dev/{username}`

API provides public retrieval endpoints by username.

### 1.2 Page ownership

* Authenticated users can only manage their own pages.

### 1.3 Blocks model

A Page contains Blocks ordered by `order`.
Block has:

* `type` (header, text, project, technologies, link, separator)
* `order` (integer)

Each `type` has a dedicated payload entity.
The API returns blocks as a unified structure with a `data` field.

### 1.4 Header rules

* Exactly one `header` block per page.
* Header is mandatory.

### 1.5 Save model

The UI uses an explicit "Save" button.
The API supports:

* granular updates (create/update/delete a block)
* and an optional bulk "replace blocks" endpoint (recommended for drag and drop and batch save)

---

## 2) DTOs

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

### 2.2 Page DTO (owner)

```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 2.3 Public Page DTO

```json
{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "blocks": [
    {
      "id": "blk_1",
      "type": "header",
      "order": 1,
      "data": {
        "title": "Lazare Fortune",
        "jobTitle": "Developpeur full stack",
        "bio": "Optional bio",
        "avatarUrl": "https://cdn.example.com/u/1/avatar.png"
      },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:00:00.000Z"
    }
  ],
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}
```

### 2.4 Block DTO (unified)

```json
{
  "id": "blk_123",
  "type": "text",
  "order": 2,
  "data": {},
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:00:00.000Z"
}
```

### 2.5 Block type payloads

#### 2.5.1 Header data (type=header)

```json
{
  "title": "Display name",
  "jobTitle": "Developpeur full stack",
  "bio": "optional",
  "avatarUrl": "optional url"
}
```

Rules:

* `title` required
* `jobTitle` required
* `bio` optional
* `avatarUrl` optional

#### 2.5.2 Text data (type=text)

```json
{ "text": "Some text" }
```

Rules:

* `text` required

#### 2.5.3 Link data (type=link)

```json
{
  "label": "My GitHub",
  "url": "https://github.com/...",
  "icon": "optional"
}
```

Rules:

* `label` required
* `url` required (valid URL)

#### 2.5.4 Separator data (type=separator)

```json
{ "style": "default" }
```

Rules:

* `style` optional

#### 2.5.5 Project data (type=project)

```json
{
  "title": "Project name",
  "description": "short description",
  "link": "https://example.com",
  "assets": [
    {
      "id": "pas_1",
      "type": "image",
      "url": "https://cdn.example.com/p/1/img.png",
      "createdAt": "2026-01-15T18:00:00.000Z"
    }
  ]
}
```

Rules:

* `title` required
* `description` optional
* `link` optional
* `assets` optional

#### 2.5.6 Technologies data (type=technologies)

```json
{
  "technologyIds": ["tec_1", "tec_2"],
  "technologies": [
    {
      "id": "tec_1",
      "name": "React",
      "logoUrl": "https://cdn.example.com/t/react.png",
      "createdByUser": false,
      "createdAt": "2026-01-10T10:00:00.000Z"
    }
  ]
}
```

Rules:

* `technologyIds` required
* Backend may include expanded `technologies` for convenience

### 2.6 Technology DTO

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

Creates a user (unverified) and sends a verification code.

* `POST /api/v1/auth/register`

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

* 409 EMAIL_ALREADY_EXISTS
* 400 VALIDATION_ERROR

---

### 3.2 Verify email (code)

Validates the account using the code received by email.

* `POST /api/v1/auth/verify-email`

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

* 400 INVALID_CODE
* 400 CODE_EXPIRED
* 404 USER_NOT_FOUND

---

### 3.3 Resend verification code

Sends a new verification code if user is not verified.

* `POST /api/v1/auth/resend-verification-code`

Request:

```json
{
  "email": "user@example.com"
}
```

Response 200:

```json
{
  "status": "SENT"
}
```

Errors:

* 404 USER_NOT_FOUND
* 409 ALREADY_VERIFIED
* 429 RATE_LIMITED

---

### 3.4 Login

Authenticates user and sets refresh cookie.

* `POST /api/v1/auth/login`

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

* Sets cookie `cb_refresh`.

Errors:

* 401 INVALID_CREDENTIALS
* 403 EMAIL_NOT_VERIFIED

---

### 3.5 Refresh session

Issues a new access token using refresh cookie.

* `POST /api/v1/auth/refresh`

Request:

* No JSON body.
* Requires cookie `cb_refresh`.

Response 200:

```json
{
  "accessToken": "jwt_access_token"
}
```

Errors:

* 401 INVALID_REFRESH_TOKEN

---

### 3.6 Logout

Invalidates refresh cookie.

* `POST /api/v1/auth/logout`

Request:

* No JSON body.

Response 204: no content

---

### 3.7 Request password reset

Sends a password reset email containing a link with a token.

* `POST /api/v1/auth/password/forgot`

Request:

```json
{
  "email": "user@example.com"
}
```

Response 200:

```json
{
  "status": "SENT"
}
```

Notes:

* Response is 200 even if email does not exist (anti-enumeration).

---

### 3.8 Reset password

Resets password using token from email link.

* `POST /api/v1/auth/password/reset`

Request:

```json
{
  "token": "reset_token_from_link",
  "newPassword": "NewStrongPassword123!"
}
```

Response 200:

```json
{
  "status": "RESET"
}
```

Errors:

* 400 TOKEN_EXPIRED
* 400 TOKEN_INVALID

---

## 4) Users API (authenticated)

### 4.1 Get current user

* `GET /api/v1/me`

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

* 401 UNAUTHORIZED

---

### 4.2 Delete account

Hard delete user and all owned data.

* `DELETE /api/v1/me`

Request:

```json
{
  "password": "CurrentPassword123!"
}
```

Response 204: no content

Errors:

* 401 UNAUTHORIZED
* 401 INVALID_CREDENTIALS

---

## 5) Username API (authenticated)

### 5.1 Check username availability

* `GET /api/v1/usernames/check?username=lazarefortune`

Response 200:

```json
{
  "username": "lazarefortune",
  "available": true
}
```

Rules:

* Lowercase normalization recommended.

---

### 5.2 Set or update username

Sets the username for a specific page.

* `PATCH /api/v1/pages/{pageId}/username`

Request:

```json
{
  "username": "lazarefortune"
}
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

* 409 USERNAME_TAKEN
* 404 PAGE_NOT_FOUND
* 403 FORBIDDEN

---

## 6) Pages API (authenticated)

### 6.1 List my pages

* `GET /api/v1/pages`

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
  "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
}
```

---

### 6.2 Create page

Creates a new page (public by default).

* `POST /api/v1/pages`

Request:

```json
{
  "username": "optional_username"
}
```

Response 201:

```json
{
  "page": {
    "id": "pag_123",
    "username": "auto_generated_if_missing",
    "isPublic": true,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
  }
}
```

Notes:

* If `username` missing, backend auto-generates one.
* Backend creates mandatory `header` block for the page.

Errors:

* 409 USERNAME_TAKEN

---

### 6.3 Get my page (with blocks)

* `GET /api/v1/pages/{pageId}`

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
        "order": 1,
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

* 404 PAGE_NOT_FOUND
* 403 FORBIDDEN

---

### 6.4 Delete a page

Hard delete a page and its blocks.

* `DELETE /api/v1/pages/{pageId}`

Response 204: no content

Errors:

* 404 PAGE_NOT_FOUND
* 403 FORBIDDEN

---

## 7) Public Pages API (no auth)

### 7.1 Get public page by username

* `GET /api/v1/public/pages/{username}`

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
        "order": 1,
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

* 404 PAGE_NOT_FOUND
* 403 PAGE_NOT_PUBLIC

---

## 8) Blocks API (authenticated)

### 8.1 Create a block

Creates a block of a given type.

* `POST /api/v1/pages/{pageId}/blocks`

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

Rules:

* Backend validates `data` for the given `type`.

Errors:

* 404 PAGE_NOT_FOUND
* 403 FORBIDDEN
* 422 INVALID_BLOCK_TYPE
* 422 INVALID_BLOCK_DATA

---

### 8.2 Update a block

* `PATCH /api/v1/pages/{pageId}/blocks/{blockId}`

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

* 404 BLOCK_NOT_FOUND
* 403 FORBIDDEN
* 422 INVALID_BLOCK_DATA

---

### 8.3 Delete a block

* `DELETE /api/v1/pages/{pageId}/blocks/{blockId}`

Response 204: no content

Rules:

* Deleting the `header` block is not allowed.

Errors:

* 404 BLOCK_NOT_FOUND
* 403 FORBIDDEN
* 409 CANNOT_DELETE_HEADER

---

### 8.4 Bulk replace blocks (recommended for Save)

Replaces all blocks of a page in one request.
This is the recommended endpoint for the explicit "Save" button.

* `PUT /api/v1/pages/{pageId}/blocks`

Request:

```json
{
  "blocks": [
    {
      "clientKey": "tmp_1",
      "type": "header",
      "order": 1,
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
      "order": 2,
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
      "order": 1,
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
      "order": 2,
      "data": { "text": "Hello" },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    }
  ]
}
```

Rules:

* Must contain exactly one header block.
* Backend validates each block payload.
* Backend persists ordering exactly as provided.
* `clientKey` helps map frontend temporary blocks to backend blocks (optional but recommended).

Errors:

* 422 HEADER_REQUIRED
* 422 MULTIPLE_HEADERS_NOT_ALLOWED
* 422 INVALID_BLOCK_DATA

---

## 9) Project assets API (authenticated)

V1 includes project assets (images/files) linked to a project.
The simplest contract is: upload first, then reference URL in project data.

### 9.1 Create an upload URL (optional)

If you want controlled uploads, the backend can issue a presigned URL.
If you do not use presigned uploads in V1, you can omit this endpoint.

* `POST /api/v1/uploads`

Request:

```json
{
  "purpose": "project_asset",
  "fileName": "demo.png",
  "contentType": "image/png"
}
```

Response 201:

```json
{
  "upload": {
    "uploadUrl": "https://storage...",
    "fileUrl": "https://cdn.../demo.png"
  }
}
```

---

## 10) Technologies API

### 10.1 List technologies

Returns the global list for selection.

* `GET /api/v1/technologies?query=rea&page=1&limit=20`

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

### 10.2 Create technology (user-added)

Allows users to add a technology not in the prefilled list.

* `POST /api/v1/technologies`

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

* 409 TECHNOLOGY_ALREADY_EXISTS
* 400 VALIDATION_ERROR

---

## 11) Health

### 11.1 Health check

* `GET /api/v1/health`

Response 200:

```json
{ "status": "ok" }
```

---

## 12) Authorization rules summary

* Public endpoints:

  * `GET /api/v1/public/pages/{username}`
  * `GET /api/v1/health`

* Authenticated endpoints require valid access token:

  * `GET /api/v1/me`
  * `DELETE /api/v1/me`
  * `GET/POST/DELETE /api/v1/pages...`
  * `POST/PATCH/DELETE/PUT /api/v1/pages/{pageId}/blocks...`
  * `GET/POST /api/v1/technologies`

* Ownership:

  * A user can only access/modify their own pages and blocks.

---

## 13) Validation rules summary (backend is source of truth)

* Register:

  * email valid
  * password meets policy

* Verify email:

  * code matches most recent active code
  * not expired
  * not used

* Reset password:

  * token valid
  * not expired
  * not used

* Pages:

  * username unique

* Blocks:

  * type must be supported
  * data must match type schema
  * exactly one header per page
  * header cannot be deleted

---

## 14) Error codes (recommended set)

Auth:

* EMAIL_ALREADY_EXISTS
* INVALID_CREDENTIALS
* EMAIL_NOT_VERIFIED
* INVALID_CODE
* CODE_EXPIRED
* INVALID_REFRESH_TOKEN
* TOKEN_INVALID
* TOKEN_EXPIRED

Pages:

* PAGE_NOT_FOUND
* PAGE_NOT_PUBLIC
* USERNAME_TAKEN

Blocks:

* BLOCK_NOT_FOUND
* INVALID_BLOCK_TYPE
* INVALID_BLOCK_DATA
* HEADER_REQUIRED
* MULTIPLE_HEADERS_NOT_ALLOWED
* CANNOT_DELETE_HEADER

General:

* VALIDATION_ERROR
* UNAUTHORIZED
* FORBIDDEN
* RATE_LIMITED
---

# API_CONTRACT.md - CodeBranch (V1)

This document defines the HTTP API contract for CodeBranch V1.
It covers all V1 features derived from the MCD and PRD.
ASCII only.

---

## 0) General conventions

### 0.1 Base URL
- All endpoints are prefixed with: `/api/v1`
- Example local backend: `http://localhost:3001/api/v1`

### 0.2 Content type
- Requests with body: `Content-Type: application/json`
- Responses: `application/json`

### 0.3 Authentication
- Access token: JWT, sent via header
- Refresh token: httpOnly cookie

Header:
- `Authorization: Bearer <access_token>`

Cookie:
- `cb_refresh=<refresh_token>`

Notes:
- Access token is short-lived.
- Refresh token is longer-lived.
- When access token expires, frontend calls refresh endpoint.

### 0.4 Timestamps
- ISO 8601 UTC: `YYYY-MM-DDTHH:MM:SS.sssZ`

### 0.5 IDs
- All `id` values are opaque strings (UUID or similar).

### 0.6 Errors (standard format)
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

details is optional.

requestId is always present.

0.7 Rate limiting

Auth endpoints are rate limited.

429 response code may be returned.

Optional header: Retry-After: <seconds>

0.8 Status codes used

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

1) Core concepts
1.1 Public URL scheme

Public pages are reachable via:

https://codebranch.dev/{username}

API provides public retrieval endpoints by username.

1.2 Page ownership

Authenticated users can only manage their own pages.

1.3 Blocks model

A Page contains Blocks ordered by order.
Block has:

type (header, text, project, technologies, link, separator)

order (integer)

Each type has a dedicated payload entity.
The API returns blocks as a unified structure with a data field.

1.4 Header rules

Exactly one header block per page.

Header is mandatory.

1.5 Save model

The UI uses an explicit "Save" button.
The API supports:

granular updates (create/update/delete a block)

and an optional bulk "replace blocks" endpoint (recommended for drag and drop and batch save)

2) DTOs
2.1 User DTO

{
  "id": "usr_123",
  "email": "user@example.com",
  "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:05:00.000Z"
}

2.2 Page DTO (owner)

{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}

2.3 Public Page DTO

{
  "id": "pag_123",
  "username": "lazarefortune",
  "isPublic": true,
  "blocks": [
    {
      "id": "blk_1",
      "type": "header",
      "order": 1,
      "data": {
        "title": "Lazare Fortune",
        "jobTitle": "Developpeur full stack",
        "bio": "Optional bio",
        "avatarUrl": "https://cdn.example.com/u/1/avatar.png"
      },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:00:00.000Z"
    }
  ],
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:10:00.000Z"
}


2.4 Block DTO (unified)

{
  "id": "blk_123",
  "type": "text",
  "order": 2,
  "data": {},
  "createdAt": "2026-01-15T18:00:00.000Z",
  "updatedAt": "2026-01-15T18:00:00.000Z"
}


2.5 Block type payloads
2.5.1 Header data (type=header)

{
  "title": "Display name",
  "jobTitle": "Developpeur full stack",
  "bio": "optional",
  "avatarUrl": "optional url"
}

Rules:

title required

jobTitle required

bio optional

avatarUrl optional

2.5.2 Text data (type=text)

{ "text": "Some text" }


Rules:

text required

2.5.3 Link data (type=link)
{
  "label": "My GitHub",
  "url": "https://github.com/...",
  "icon": "optional"
}


Rules:

label required

url required (valid URL)

2.5.4 Separator data (type=separator)
{ "style": "default" }


Rules:

style optional

2.5.5 Project data (type=project)
{
  "title": "Project name",
  "description": "short description",
  "link": "https://example.com",
  "assets": [
    {
      "id": "pas_1",
      "type": "image",
      "url": "https://cdn.example.com/p/1/img.png",
      "createdAt": "2026-01-15T18:00:00.000Z"
    }
  ]
}


Rules:

title required

description optional

link optional

assets optional

Note:

Project is stored as dedicated entity, but the API returns it under data for convenience.

2.5.6 Technologies data (type=technologies)
{
  "technologyIds": ["tec_1", "tec_2"],
  "technologies": [
    {
      "id": "tec_1",
      "name": "React",
      "logoUrl": "https://cdn.example.com/t/react.png",
      "createdByUser": false,
      "createdAt": "2026-01-10T10:00:00.000Z"
    }
  ]
}


Rules:

technologyIds required

Backend may include expanded technologies for convenience

2.6 Technology DTO
{
  "id": "tec_1",
  "name": "React",
  "logoUrl": "https://cdn.example.com/t/react.png",
  "createdByUser": false,
  "createdAt": "2026-01-10T10:00:00.000Z"
}

3) Auth API
3.1 Register

Creates a user (unverified) and sends a verification code.

POST /api/v1/auth/register

Request:

{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}


Response 201:

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


Errors:

409 EMAIL_ALREADY_EXISTS

400 VALIDATION_ERROR

3.2 Verify email (code)

Validates the account using the code received by email.

POST /api/v1/auth/verify-email

Request:

{
  "email": "user@example.com",
  "code": "123456"
}


Response 200:

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


Errors:

400 INVALID_CODE

400 CODE_EXPIRED

404 USER_NOT_FOUND

3.3 Resend verification code

Sends a new verification code if user is not verified.

POST /api/v1/auth/resend-verification-code

Request:

{ "email": "user@example.com" }


Response 200:

{ "status": "SENT" }


Errors:

404 USER_NOT_FOUND

409 ALREADY_VERIFIED

429 RATE_LIMITED

3.4 Login

Authenticates user and sets refresh cookie.

POST /api/v1/auth/login

Request:

{
  "email": "user@example.com",
  "password": "StrongPassword123!"
}


Response 200:

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


Notes:

Sets cookie cb_refresh.

Errors:

401 INVALID_CREDENTIALS

403 EMAIL_NOT_VERIFIED

3.5 Refresh session

Issues a new access token using refresh cookie.

POST /api/v1/auth/refresh

Request:

No JSON body.

Requires cookie cb_refresh.

Response 200:

{ "accessToken": "jwt_access_token" }


Errors:

401 INVALID_REFRESH_TOKEN

3.6 Logout

Invalidates refresh cookie.

POST /api/v1/auth/logout

Request:

No JSON body.

Response 204: no content

3.7 Request password reset

Sends a password reset email containing a link with a token.

POST /api/v1/auth/password/forgot

Request:

{ "email": "user@example.com" }


Response 200:

{ "status": "SENT" }


Notes:

Response is 200 even if email does not exist (anti-enumeration).

3.8 Reset password

Resets password using token from email link.

POST /api/v1/auth/password/reset

Request:

{
  "token": "reset_token_from_link",
  "newPassword": "NewStrongPassword123!"
}


Response 200:

{ "status": "RESET" }


Errors:

400 TOKEN_EXPIRED

400 TOKEN_INVALID

4) Users API (authenticated)
4.1 Get current user

GET /api/v1/me

Response 200:

{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "emailVerifiedAt": "2026-01-15T18:05:00.000Z",
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:05:00.000Z"
  }
}


Errors:

401 UNAUTHORIZED

4.2 Delete account

Hard delete user and all owned data.

DELETE /api/v1/me

Request:

{ "password": "CurrentPassword123!" }


Response 204: no content

Errors:

401 UNAUTHORIZED

401 INVALID_CREDENTIALS

5) Username API (authenticated)
5.1 Check username availability

GET /api/v1/usernames/check?username=lazarefortune

Response 200:

{
  "username": "lazarefortune",
  "available": true
}


Rules:

Lowercase normalization recommended.

5.2 Set or update username

Sets the username for a specific page.

PATCH /api/v1/pages/{pageId}/username

Request:

{ "username": "lazarefortune" }


Response 200:

{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": true,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:10:00.000Z"
  }
}


Errors:

409 USERNAME_TAKEN

404 PAGE_NOT_FOUND

403 FORBIDDEN

6) Pages API (authenticated)
6.1 List my pages

GET /api/v1/pages

Response 200:

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
  "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
}

6.2 Create page

Creates a new page (public by default).

POST /api/v1/pages

Request:

{ "username": "optional_username" }


Response 201:

{
  "page": {
    "id": "pag_123",
    "username": "auto_generated_if_missing",
    "isPublic": true,
    "createdAt": "2026-01-15T18:00:00.000Z",
    "updatedAt": "2026-01-15T18:00:00.000Z"
  }
}


Notes:

If username missing, backend auto-generates one.

Backend creates mandatory header block for the page.

Errors:

409 USERNAME_TAKEN

6.3 Get my page (with blocks)

GET /api/v1/pages/{pageId}

Response 200:

{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": true,
    "blocks": [
      {
        "id": "blk_1",
        "type": "header",
        "order": 1,
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


Errors:

404 PAGE_NOT_FOUND

403 FORBIDDEN

6.4 Delete a page

Hard delete a page and its blocks.

DELETE /api/v1/pages/{pageId}

Response 204: no content

Errors:

404 PAGE_NOT_FOUND

403 FORBIDDEN

7) Public Pages API (no auth)
7.1 Get public page by username

GET /api/v1/public/pages/{username}

Response 200:

{
  "page": {
    "id": "pag_123",
    "username": "lazarefortune",
    "isPublic": true,
    "blocks": [
      {
        "id": "blk_1",
        "type": "header",
        "order": 1,
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


Errors:

404 PAGE_NOT_FOUND

403 PAGE_NOT_PUBLIC

8) Blocks API (authenticated)
8.1 Create a block

Creates a block of a given type.

POST /api/v1/pages/{pageId}/blocks

Request:

{
  "type": "text",
  "order": 2,
  "data": { "text": "Hello" }
}


Response 201:

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


Rules:

Backend validates data for the given type.

Errors:

404 PAGE_NOT_FOUND

403 FORBIDDEN

422 INVALID_BLOCK_TYPE

422 INVALID_BLOCK_DATA

8.2 Update a block

PATCH /api/v1/pages/{pageId}/blocks/{blockId}

Request:

{
  "order": 3,
  "data": { "text": "Updated" }
}


Response 200:

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


Errors:

404 BLOCK_NOT_FOUND

403 FORBIDDEN

422 INVALID_BLOCK_DATA

8.3 Delete a block

DELETE /api/v1/pages/{pageId}/blocks/{blockId}

Response 204: no content

Rules:

Deleting the header block is not allowed.

Errors:

404 BLOCK_NOT_FOUND

403 FORBIDDEN

409 CANNOT_DELETE_HEADER

8.4 Bulk replace blocks (recommended for Save)

Replaces all blocks of a page in one request.
This is the recommended endpoint for the explicit "Save" button.

PUT /api/v1/pages/{pageId}/blocks

Request:

{
  "blocks": [
    {
      "clientKey": "tmp_1",
      "type": "header",
      "order": 1,
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
      "order": 2,
      "data": { "text": "Hello" }
    }
  ]
}


Response 200:

{
  "blocks": [
    {
      "id": "blk_1",
      "type": "header",
      "order": 1,
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
      "order": 2,
      "data": { "text": "Hello" },
      "createdAt": "2026-01-15T18:00:00.000Z",
      "updatedAt": "2026-01-15T18:10:00.000Z"
    }
  ]
}


Rules:

Must contain exactly one header block.

Backend validates each block payload.

Backend persists ordering exactly as provided.

clientKey helps map frontend temporary blocks to backend blocks (optional but recommended).

Errors:

422 HEADER_REQUIRED

422 MULTIPLE_HEADERS_NOT_ALLOWED

422 INVALID_BLOCK_DATA

9) Project assets API (authenticated)

V1 includes project assets (images/files) linked to a project.
The simplest contract is: upload first, then reference URL in project data.

9.1 Create an upload URL (optional)

If you want controlled uploads, the backend can issue a presigned URL.
If you do not use presigned uploads in V1, you can omit this endpoint.

POST /api/v1/uploads

Request:

{
  "purpose": "project_asset",
  "fileName": "demo.png",
  "contentType": "image/png"
}


Response 201:

{
  "upload": {
    "uploadUrl": "https://storage.example.com/upload/...",
    "fileUrl": "https://cdn.example.com/assets/demo.png"
  }
}

10) Technologies API
10.1 List technologies

Returns the global list for selection.

GET /api/v1/technologies?query=rea&page=1&limit=20

Response 200:

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

10.2 Create technology (user-added)

Allows users to add a technology not in the prefilled list.

POST /api/v1/technologies

Request:

{
  "name": "Laravel",
  "logoUrl": "https://cdn.example.com/t/laravel.png"
}


Response 201:

{
  "technology": {
    "id": "tec_9",
    "name": "Laravel",
    "logoUrl": "https://cdn.example.com/t/laravel.png",
    "createdByUser": true,
    "createdAt": "2026-01-15T18:00:00.000Z"
  }
}


Errors:

409 TECHNOLOGY_ALREADY_EXISTS

400 VALIDATION_ERROR

11) Health
11.1 Health check

GET /api/v1/health

Response 200:

{ "status": "ok" }

12) Authorization rules summary

Public endpoints:

GET /api/v1/public/pages/{username}

GET /api/v1/health

Authenticated endpoints require valid access token:

GET /api/v1/me

DELETE /api/v1/me

GET/POST/DELETE /api/v1/pages...

PATCH /api/v1/pages/{pageId}/username

POST/PATCH/DELETE/PUT /api/v1/pages/{pageId}/blocks...

GET/POST /api/v1/technologies

POST /api/v1/uploads (if used)

Ownership:

A user can only access/modify their own pages and blocks.

13) Validation rules summary (backend is source of truth)

Register:

email valid

password meets policy

Verify email:

code matches most recent active code

not expired

not used

Reset password:

token valid

not expired

not used

Pages:

username unique

Blocks:

type must be supported

data must match type schema

exactly one header per page

header cannot be deleted

14) Error codes (recommended set)

Auth:

EMAIL_ALREADY_EXISTS

INVALID_CREDENTIALS

EMAIL_NOT_VERIFIED

INVALID_CODE

CODE_EXPIRED

INVALID_REFRESH_TOKEN

TOKEN_INVALID

TOKEN_EXPIRED

Pages:

PAGE_NOT_FOUND

PAGE_NOT_PUBLIC

USERNAME_TAKEN

Blocks:

BLOCK_NOT_FOUND

INVALID_BLOCK_TYPE

INVALID_BLOCK_DATA

HEADER_REQUIRED

MULTIPLE_HEADERS_NOT_ALLOWED

CANNOT_DELETE_HEADER

Technologies:

TECHNOLOGY_ALREADY_EXISTS

General:

VALIDATION_ERROR

UNAUTHORIZED

FORBIDDEN

RATE_LIMITED

End of document.

