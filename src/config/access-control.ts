// Access control configuration: declarative page + API prefix -> required permission mapping
// Provides longest-prefix rule resolution via findAccessRule for client guards (and future middleware).
// No side effects; consumed by hooks (useProtectPage) & guardApiAccess.
import { PERMISSIONS } from '@/config/roles';

// Page (app router) path prefix -> required permissions (ALL must pass)
// Order no longer matters once longest-prefix logic below is applied, but keep specific before general for readability.
export const PAGE_ACCESS_RULES: { prefix: string; permissions: string[] }[] = [
  { prefix: '/users/new', permissions: [PERMISSIONS.EDIT_USERS] },            // create user page
  { prefix: '/users/', permissions: [PERMISSIONS.EDIT_USERS] },                // edit user pages (/users/:id/...)
  { prefix: '/users', permissions: [PERMISSIONS.READ_USERS] },                 // users list (view only)
  // add more page rules here (place more specific prefixes first)
];

// API route path prefix -> required permissions (ALL must pass)
// NOTE: '/api/users' will also match '/api/users/...'
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Method-aware API rules. If methods map present, use per-method permissions; else fall back to permissions.
export type ApiAccessRule = {
  prefix: string; // path prefix
  permissions?: Permission[]; // fallback permissions (ALL must pass)
  methods?: Partial<Record<string, Permission[]>>; // e.g. { GET: [...], POST: [...] }
};

export const API_ACCESS_RULES: ApiAccessRule[] = [
  {
    prefix: '/api/users',
    methods: {
      GET: [PERMISSIONS.READ_USERS],
      POST: [PERMISSIONS.EDIT_USERS],
      PATCH: [PERMISSIONS.EDIT_USERS],
      DELETE: [PERMISSIONS.DELETE_USERS],
    },
  },
  // add more API rules here
];

export type AccessRuleMatch = {
  permissions: Permission[];
  type: 'page' | 'api';
};

// Longest-prefix matcher so that more specific rules override broader ones automatically.
export function findAccessRule(pathname: string): AccessRuleMatch | null {
  if (pathname.startsWith('/api/')) {
    let match: ApiAccessRule | undefined;
    for (const r of API_ACCESS_RULES) {
      if (pathname.startsWith(r.prefix)) {
        if (!match || r.prefix.length > match.prefix.length) match = r;
      }
    }
    if (match) {
      const perms = match.methods?.['GET'] || match.permissions || [];
      return { permissions: perms, type: 'api' };
    }
  } else {
    let match: { prefix: string; permissions: string[] } | undefined;
    for (const r of PAGE_ACCESS_RULES) {
      if (pathname.startsWith(r.prefix)) {
        if (!match || r.prefix.length > match.prefix.length) match = r;
      }
    }
    if (match) return { permissions: match.permissions as Permission[], type: 'page' };
  }
  return null;
}

// Guard functions live in lib/access-guard.ts – this file is purely declarative configuration + rule lookup.
