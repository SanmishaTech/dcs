// Application navigation tree definition. Items filtered at runtime based on user permissions.
// Keeps UI structure & required permissions centralized (avoid scattering nav logic).
import { PERMISSIONS } from '@/config/roles';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import type { ComponentType } from 'react';

export type NavLeafItem = {
  type?: 'item';
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission: string; // permission required to view
};

export type NavGroupItem = {
  type: 'group';
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: NavLeafItem[]; // children filtered by permission dynamically
};

export type NavItem = NavLeafItem | NavGroupItem;

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.VIEW_DASHBOARD,
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: LayoutDashboard,
    permission: PERMISSIONS.READ_PROJECT,
  },
  {
    type: 'group',
    title: 'Settings',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '/users',
        icon: Users,
        permission: PERMISSIONS.READ_USERS,
      },
    ],
  },
];
