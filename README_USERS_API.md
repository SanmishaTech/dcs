# Users API Reference

This document describes the Users API endpoints, request/response shapes, permissions, and coding standards as implemented under `src/app/api/users`.

## Conventions & Coding Standards
- Framework: Next.js App Router Route Handlers.
- All handlers are async functions exported per HTTP method (`GET`, `POST`, etc.).
- Authentication: Access token cookie (`accessToken`); validated via `guardApiAccess` (except `/api/users/me`).
- Authorization: RBAC using `guardApiAccess` + `API_ACCESS_RULES` + `ROLES_PERMISSIONS`.
- Responses: Unified helpers from `lib/api-response` (`Success`, `Error`, `Unauthorized`, etc.).
- Pagination: Utility `paginate` with `page` and `perPage` query params.
- Sorting: Whitelisted `sort` fields; defaults to `createdAt desc`.
- Validation: Minimal manual shape validation; reject on missing required fields early.
- Security: Inputs converted to proper numeric types; rejects invalid IDs and shallow validation to prevent mass-assignment.
- Passwords: Hash with `bcryptjs` (cost 10) before persistence (`passwordHash`).
- Error Codes: 400 (validation), 404 (not found), 409 (conflict), 401 (auth), 403 (permission) implicit via guard, 500 generic.

## Permissions Summary
| Endpoint | Method | Permission(s) | Notes |
|----------|--------|---------------|-------|
| /api/users | GET | READ:USERS | List + filter + paginate |
| /api/users | POST | EDIT:USERS | Create new user |
| /api/users | PATCH | EDIT:USERS | Partial update (status, role, name) |
| /api/users | DELETE | MANAGE:USERS | Not implemented at collection; individual delete uses /api/users/:id |
| /api/users/:id | GET | READ:USERS | Fetch single user |
| /api/users/:id | DELETE | MANAGE:USERS | Delete user |
| /api/users/me | GET | (auth only) | Returns current authenticated user |

## Endpoint Details

### GET /api/users
Query Parameters:
- `search` (string) – partial match on name or email.
- `role` (string) – exact role filter.
- `status` (true|false) – active flag.
- `page` (number >=1; default 1)
- `perPage` (1..100; default 10)
- `sort` (one of: name,email,role,status,createdAt,lastLogin; default createdAt)
- `order` (asc|desc; default desc)

Response (200):
```
{
  "ok": true,
  "data": {
    "items": [ { id, name, email, role, status, lastLogin, createdAt }, ... ],
    "page": 1,
    "perPage": 10,
    "total": 42,
    "pageCount": 5
  }
}
```

### POST /api/users
Body JSON:
```
{
  "name": "Optional Name",
  "email": "user@example.com",
  "password": "plaintext",
  "role": "user", // required
  "status": true   // optional (default true)
}
```
Responses:
- 201 Created with user object (no password hash).
- 400 missing email/password/role.
- 409 email already exists.

### PATCH /api/users
Body JSON (partial):
```
{
  "id": 7,
  "status": false,
  "role": "admin",
  "name": "Renamed"
}
```
Rules:
- At least one mutable field required.
- `id` mandatory.

Responses:
- 200 updated user.
- 400 invalid/missing fields.
- 404 user not found.

### GET /api/users/:id
Path: `/api/users/123`
Responses:
- 200 user
- 404 not found
- 400 invalid id

### DELETE /api/users/:id
Responses:
- 200 `{ id }`
- 404 not found
- 400 invalid id

### GET /api/users/me
Auth-only; no explicit permission requirement.
Response: Current user profile subset.
Errors:
- 401 missing/invalid token
- 404 user not found (stale token)

## Error Response Shape
```
{ "ok": false, "error": "Message", "status": 400 }
```

## Success Response Shape
```
{ "ok": true, "data": <payload> }
```

## Example Usage (fetch)
```ts
async function listUsers() {
  const res = await fetch('/api/users?page=1&perPage=20');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data.items;
}
```

## Future Improvements
- Add schema validation via Zod for stronger input guarantees.
- Implement rate limiting.
- Add field-level filtering (select) & expansion parameters.
- Keep audit trails for user changes.

---
Generated for internal coding standards alignment.
