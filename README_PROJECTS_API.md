# Projects & Project Files API Reference

## Overview
Endpoints for managing projects and their file attachments. RBAC enforced via `guardApiAccess` + `API_ACCESS_RULES` and per-project membership checks for `project_user` role.

Roles recap:
- admin: full permissions (create/update/delete projects, manage users, upload/delete files)
- user: read-only for projects & files (no create/upload/delete)
- project_user: can only read its own project(s) and associated files.

## Permissions Used
| Permission | Purpose |
|------------|---------|
| CREATE:PROJECT | Create new project |
| READ:PROJECT | View project(s) |
| UPDATE:PROJECT | Edit project metadata |
| DELETE:PROJECT | Delete project |
| MANAGE:PROJECT:USERS | (Future) add/remove project members |
| UPLOAD:PROJECT:FILE | Add new file metadata / upload |
| READ:PROJECT:FILE | View/download project files |
| DELETE:PROJECT:FILE | Delete file |

## Project Endpoints

### GET /api/projects
Query Params:
- `search` (matches name/clientName/location)
- `page`, `perPage` (pagination; defaults 1 / 10; max 100)
- `sort` (name|clientName|location|createdAt)
- `order` asc|desc (default desc)

Behavior:
- admin/user: all projects (filtered by search)
- project_user: only projects where membership in `ProjectUser` exists.

Returns paginated list with counts: `{ _count: { users, files } }`.

### POST /api/projects
Body:
```
{
  "name": "Project Alpha",
  "clientName": "ACME Corp",
  "location": "NYC",
  "description": "Discovery phase"
}
```
Responses:
- 201 created project
- 400 missing name/clientName

### GET /api/projects/:id
- Membership enforced for `project_user`.
- Returns project data + file count (users list not exposed in response body, only counted).

### PATCH /api/projects/:id
Partial update body fields: `name`, `clientName`, `location`, `description`.
- 400 if none provided
- 404 if not found

### DELETE /api/projects/:id
Deletes project (cascades to related `ProjectUser` & `ProjectFile` via Prisma relations if configured with onDelete Cascade).

## Project Files Endpoints
Flat route; can be nested in future.

### GET /api/project-files?projectId=123
- Requires READ:PROJECT:FILE
- `project_user` must be member of project.

### POST /api/project-files
Body:
```
{
  "projectId": 123,
  "originalName": "specs.pdf",
  "filename": "a1b2c3.pdf",
  "mimeType": "application/pdf",
  "size": 102400,
  "storageKey": "projects/123/a1b2c3.pdf",
  "url": "https://cdn.example.com/projects/123/a1b2c3.pdf"
}
```
- Returns 201 with created metadata row.
- Does not handle binary; use a separate upload flow (signed URL or multipart) before committing metadata.

### DELETE /api/project-files
Body: `{ "id": <fileId> }`
- Deletes metadata (and you should also remove the object from storage in future hook).

## Response Shapes
Success:
```
{ "ok": true, "data": <payload> }
```
Error:
```
{ "ok": false, "error": "Message", "status": <code> }
```

## Membership Enforcement Pattern
```
if (user.role === 'project_user') {
  const membership = await prisma.projectUser.findFirst({ where: { projectId, userId: user.id }, select: { id: true } });
  if (!membership) return Error('Forbidden', 403);
}
```

## Future Enhancements
- Add bulk file upload endpoint + presigned URL issuance.
- Add MANAGE_PROJECT:USERS endpoints for membership add/remove.
- Add soft deletion / archival for projects & files.
- Add audit logging of changes and downloads.
- Support versioning of files (e.g., ProjectFileVersion model).

---
Generated for internal standards alignment.
