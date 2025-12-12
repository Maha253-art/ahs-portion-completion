'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  Settings,
  GraduationCap,
  Shield,
  BarChart3,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface MobileBottomNavProps {
  userRole: UserRole;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

export function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Define mobile nav items based on role - limited to 5 items for mobile
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [];

    // Dashboard - role specific
    if (userRole === 'super_admin') {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/super-admin',
        icon: Shield,
        roles: ['super_admin'],
      });
    } else if (userRole === 'admin') {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/admin',
        icon: BarChart3,
        roles: ['admin'],
      });
    } else if (userRole === 'facilitator') {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/facilitator',
        icon: LayoutDashboard,
        roles: ['facilitator'],
      });
    } else {
      baseItems.push({
        title: 'Dashboard',
        href: '/dashboard/student',
        icon: GraduationCap,
        roles: ['student'],
      });
    }

    // Portions/Academic
    if (userRole === 'facilitator') {
      baseItems.push({
        title: 'Portions',
        href: '/dashboard/portions',
        icon: BookOpen,
        roles: ['facilitator'],
      });
    } else if (userRole === 'super_admin' || userRole === 'admin') {
      baseItems.push({
        title: 'Portions',
        href: '/dashboard/admin/portions',
        icon: BookOpen,
        roles: ['super_admin', 'admin'],
      });
    }

    // Assessments - for non-students
    if (userRole !== 'student') {
      baseItems.push({
        title: 'Assessments',
        href: '/dashboard/assessments',
        icon: ClipboardCheck,
        roles: ['super_admin', 'admin', 'facilitator'],
      });
    }

    // Announcements - for everyone
    baseItems.push({
      title: 'Announce',
      href: '/dashboard/announcements',
      icon: Megaphone,
      roles: ['super_admin', 'admin', 'facilitator', 'student'],
    });

    // Settings - for everyone
    baseItems.push({
      title: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['super_admin', 'admin', 'facilitator', 'student'],
    });

    return baseItems.filter(item => item.roles.includes(userRole));
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-1 py-2 transition-all duration-200',
                isActive
                  ? 'text-purple-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  isActive
                    ? 'gradient-bg shadow-lg shadow-purple-500/25'
                    : 'bg-transparent'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive ? 'text-white scale-110' : ''
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium truncate max-w-[60px]',
                  isActive ? 'text-purple-600 dark:text-purple-400' : ''
                )}
              >
                {item.title}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-600 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
