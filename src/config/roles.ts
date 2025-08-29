// RBAC constants: stable permission & role identifiers plus role->permission mapping.
// Extend by adding new PERMISSIONS keys and including them in relevant ROLES_PERMISSIONS entries.
export const PERMISSIONS = {
  // User
  VIEW_DASHBOARD: "VIEW:DASHBOARD",
  READ_USERS: "READ:USERS",
  EDIT_USERS: "EDIT:USERS",
  DELETE_USERS: "MANAGE:USERS",
} as const;

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  PROJECT_ADMIN: "project_admin"
} as const;

export const ROLES_PERMISSIONS = {
  [ROLES.ADMIN]: [
    ...Object.values(PERMISSIONS)
  ],
  [ROLES.USER]: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.EDIT_USERS
  ],
  [ROLES.PROJECT_ADMIN]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.READ_USERS,
    PERMISSIONS.EDIT_USERS
  ]
};
