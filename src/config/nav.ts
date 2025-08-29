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
  {
    type: 'group',
    title: 'Dummy1',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#1',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#2',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#3',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },
  {
    type: 'group',
    title: 'Dummy2',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#4',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#5',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#6',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },  
  {
    type: 'group',
    title: 'Dummy3',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#7',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#8',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#9',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },  
  {
    type: 'group',
    title: 'Dummy4',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#10',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#11',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#12',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },  
  {
    type: 'group',
    title: 'Dummy5',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#13',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#14',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#15',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },  
  {
    type: 'group',
    title: 'Dummy6',
    icon: Settings,
    children: [
      {
        title: 'Users',
        href: '#16',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
            {
        title: 'Users',
        href: '#17',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },
      {
        title: 'Users',
        href: '#18',
        icon: Users,
        permission: PERMISSIONS.VIEW_DASHBOARD,
      },      
    ],
  },  
];
