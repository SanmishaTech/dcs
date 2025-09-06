// RBAC constants: stable permission & role identifiers plus role->permission mapping.
// Extend by adding new PERMISSIONS keys and including them in relevant ROLES_PERMISSIONS entries.
export const PERMISSIONS = {
	// Core / Dashboard
	VIEW_DASHBOARD: 'VIEW:DASHBOARD',

	// Users (existing internal management)
	READ_USERS: 'READ:USERS',
	EDIT_USERS: 'EDIT:USERS',
	DELETE_USERS: 'MANAGE:USERS',

	// Projects
	CREATE_PROJECT: 'CREATE:PROJECT', // create new project (Admin only)
	READ_PROJECT: 'READ:PROJECT', // view project(s)
	EDIT_PROJECT: 'EDIT:PROJECT', // edit project metadata
	DELETE_PROJECT: 'DELETE:PROJECT', // delete project
	MANAGE_PROJECT_USERS: 'MANAGE:PROJECT:USERS', // add/remove users to project

	// Project Files
	UPLOAD_PROJECT_FILE: 'UPLOAD:PROJECT:FILE', // upload / attach file to project
	READ_PROJECT_FILE: 'READ:PROJECT:FILE', // download/view project files
	DELETE_PROJECT_FILE: 'DELETE:PROJECT:FILE', // remove project files
	// Blocks & Cracks
	IMPORT_CRACKS: 'IMPORT:CRACKS', // import crack identifications via Excel
	READ_CRACKS: 'READ:CRACKS',
	MANAGE_BLOCKS: 'MANAGE:BLOCKS',
	// Design Maps
	READ_DESIGN_MAP: 'READ:DESIGN:MAP',
	WRITE_DESIGN_MAP: 'WRITE:DESIGN:MAP',
} as const;

export const ROLES = {
	ADMIN: 'admin', // full system access
	USER: 'user', // internal staff (can see dashboard, read projects/users, but not create projects or upload files)
	PROJECT_USER: 'project_user', // external / client user tied to specific projects (can only read its own project + files)
} as const;

export const ROLES_PERMISSIONS = {
	// Admin: everything
	[ROLES.ADMIN]: [...Object.values(PERMISSIONS)],
	// Internal staff user: can view dashboard, read users & projects & project files (but no creation/upload/delete)
	[ROLES.USER]: [
		PERMISSIONS.VIEW_DASHBOARD,
		PERMISSIONS.READ_USERS,
		PERMISSIONS.READ_PROJECT,
		PERMISSIONS.READ_PROJECT_FILE,
		PERMISSIONS.READ_CRACKS,
		PERMISSIONS.READ_DESIGN_MAP,
	],
	// Project (client) user: minimal – only read project + its files (no dashboard access if you prefer; remove if needed)
	[ROLES.PROJECT_USER]: [
		PERMISSIONS.VIEW_DASHBOARD,
		PERMISSIONS.READ_PROJECT,
		PERMISSIONS.READ_PROJECT_FILE,
		PERMISSIONS.READ_CRACKS,
		PERMISSIONS.READ_DESIGN_MAP,
	],
} as const;

// NOTE:
// - Only ADMIN retains CREATE/UPDATE/DELETE project, MANAGE_PROJECT_USERS, and file upload/delete.
// - Authorization enforcement for "its own project" must be done at the resolver/service layer:
//   1) Check the user has READ_PROJECT / READ_PROJECT_FILE.
//   2) Verify membership via ProjectUser join before returning restricted data.
// - You may expose helper guards to combine permission + membership check.
