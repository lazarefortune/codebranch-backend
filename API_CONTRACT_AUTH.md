# API Contract - Auth API

See [API_CONTRACT_COMMON.md](./API_CONTRACT_COMMON.md) for base URL, error envelope, and auth conventions.

---

## POST /api/v1/auth/register

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

---

## POST /api/v1/auth/verify-email

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

---

## POST /api/v1/auth/resend-verification-code

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

---

## POST /api/v1/auth/login

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

---

## POST /api/v1/auth/refresh

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

---

## POST /api/v1/auth/logout

Notes:
- Requires access token.
- No JSON body.
- Clears `cb_refresh` cookie.

Response:
- 204 No Content

---

## POST /api/v1/auth/password/forgot

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

---

## POST /api/v1/auth/password/reset

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

## Validation summary

- `email`: valid email format.
- `password`: min 8 chars, must include uppercase, lowercase, digit, and special character.
- `username` at register: 3-30 chars, lowercase letters, digits, `_`, `-` only.
- Verification code: exactly 6 numeric characters.

---

## Error codes

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

---

End of document.
