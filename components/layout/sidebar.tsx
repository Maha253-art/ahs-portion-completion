'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FolderKanban,
  Users,
  Settings,
  BarChart3,
  Building2,
  GraduationCap,
  UserPlus,
  Shield,
  UserCog,
  Megaphone,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface SidebarProps {
  userRole: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  section?: string;
}

const navItems: NavItem[] = [
  // Dashboard items - 4 dashboards
  {
    title: 'Super Admin Dashboard',
    href: '/dashboard/super-admin',
    icon: Shield,
    roles: ['super_admin'],
    section: 'Dashboards',
  },
  {
    title: 'Admin Dashboard',
    href: '/dashboard/admin',
    icon: BarChart3,
    roles: ['super_admin', 'admin'],
    section: 'Dashboards',
  },
  {
    title: 'Facilitator Dashboard',
    href: '/dashboard/facilitator',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'facilitator'],
    section: 'Dashboards',
  },
  {
    title: 'My Dashboard',
    href: '/dashboard/student',
    icon: GraduationCap,
    roles: ['student'],
    section: 'Dashboards',
  },
  {
    title: 'Student Dashboard',
    href: '/dashboard/student',
    icon: GraduationCap,
    roles: ['super_admin', 'admin', 'facilitator'],
    section: 'Dashboards',
  },
  // Academic items - Available to all roles including students
  {
    title: 'Assessments',
    href: '/dashboard/assessments',
    icon: ClipboardCheck,
    roles: ['facilitator', 'super_admin', 'admin', 'student'],
    section: 'Academic',
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: FolderKanban,
    roles: ['facilitator', 'super_admin', 'admin', 'student'],
    section: 'Academic',
  },
  // Management items
  {
    title: 'Departments',
    href: '/dashboard/admin/departments',
    icon: Building2,
    roles: ['super_admin'],
    section: 'Management',
  },
  {
    title: 'Facilitators',
    href: '/dashboard/admin/facilitators',
    icon: Users,
    roles: ['super_admin', 'admin'],
    section: 'Management',
  },
  {
    title: 'Students',
    href: '/dashboard/admin/students',
    icon: GraduationCap,
    roles: ['super_admin', 'admin'],
    section: 'Management',
  },
  // Users items - Admin can add facilitators and students but not super_admin
  {
    title: 'All Users',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: ['super_admin', 'admin'],
    section: 'Users',
  },
  {
    title: 'Add User',
    href: '/dashboard/admin/users/add',
    icon: UserPlus,
    roles: ['super_admin', 'admin'],
    section: 'Users',
  },
  {
    title: 'Roles',
    href: '/dashboard/admin/roles',
    icon: Shield,
    roles: ['super_admin'],
    section: 'Users',
  },
  // Communication
  {
    title: 'Announcements',
    href: '/dashboard/announcements',
    icon: Megaphone,
    roles: ['super_admin', 'admin', 'facilitator', 'student'],
    section: 'Communication',
  },
  // Settings
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['super_admin', 'admin', 'facilitator', 'student'],
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  // Normalize role - treat unknown roles as 'student'
  const effectiveRole: UserRole = ['super_admin', 'admin', 'facilitator', 'student'].includes(userRole)
    ? userRole
    : 'student';

  // Filter items based on role
  const filteredItems = navItems.filter((item) => item.roles.includes(effectiveRole));

  // Group items by section
  const groupedItems: { [key: string]: NavItem[] } = {};
  const standaloneItems: NavItem[] = [];

  filteredItems.forEach((item) => {
    if (item.section) {
      if (!groupedItems[item.section]) {
        groupedItems[item.section] = [];
      }
      groupedItems[item.section].push(item);
    } else {
      standaloneItems.push(item);
    }
  });

  const renderNavLink = (item: NavItem) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 cursor-pointer',
          isActive
            ? 'gradient-bg text-white shadow-lg shadow-[#0b6d41]/25'
            : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white hover:shadow-md'
        )}
      >
        <item.icon
          className={cn(
            'mr-3 h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110',
            isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-[#0b6d41] dark:group-hover:text-[#fbbe00]'
          )}
        />
        {item.title}
        {isActive && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 glass-sidebar z-30">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-4 mb-2">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center mr-3 animate-float shadow-lg shadow-[#0b6d41]/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gradient">Academic</span>
            <span className="block text-xs text-muted-foreground -mt-1">Tracker</span>
          </div>
        </div>

        {/* Role Badge */}
        <div className="px-4 mb-4">
          <div className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
            effectiveRole === 'super_admin' ? 'bg-[#0b6d41]/10 text-[#0b6d41]' :
            effectiveRole === 'admin' ? 'bg-[#0b6d41]/10 text-[#0b6d41]' :
            effectiveRole === 'facilitator' ? 'bg-[#fbbe00]/20 text-[#0b6d41]' :
            'bg-[#fbbe00]/20 text-[#0b6d41]'
          )}>
            {effectiveRole === 'super_admin' ? 'Super Admin' :
             effectiveRole === 'admin' ? 'Admin' :
             effectiveRole === 'facilitator' ? 'Facilitator' : 'Student'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 px-3 space-y-1">
          {/* Dashboards Section */}
          {groupedItems['Dashboards'] && groupedItems['Dashboards'].length > 0 && (
            <>
              {groupedItems['Dashboards'].map(renderNavLink)}
            </>
          )}

          {/* Academic Section */}
          {groupedItems['Academic'] && groupedItems['Academic'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Academic
                </p>
              </div>
              {groupedItems['Academic'].map(renderNavLink)}
            </>
          )}

          {/* Management Section */}
          {groupedItems['Management'] && groupedItems['Management'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Management
                </p>
              </div>
              {groupedItems['Management'].map(renderNavLink)}
            </>
          )}

          {/* Users Section */}
          {groupedItems['Users'] && groupedItems['Users'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Users
                </p>
              </div>
              {groupedItems['Users'].map(renderNavLink)}
            </>
          )}

          {/* Communication Section */}
          {groupedItems['Communication'] && groupedItems['Communication'].length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Communication
                </p>
              </div>
              {groupedItems['Communication'].map(renderNavLink)}
            </>
          )}

          {/* Settings (no section) */}
          <div className="pt-4">
            {standaloneItems.filter(item => item.title === 'Settings').map(renderNavLink)}
          </div>
        </nav>

      </div>
    </aside>
  );
}
