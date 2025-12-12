'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Shield,
  Users,
  GraduationCap,
} from 'lucide-react';
import { UserRole } from '@/types/database';

interface RoleInfo {
  role: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  permissions: string[];
  userCount: number;
}

const roleDefinitions: Omit<RoleInfo, 'userCount'>[] = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access with all permissions',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: [
      'Manage all users',
      'Manage departments',
      'View all dashboards',
      'Manage roles',
      'System settings',
      'View reports',
      'Manage all portions',
    ],
  },
  {
    role: 'facilitator',
    label: 'Facilitator',
    description: 'Teaching staff with portion management',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    permissions: [
      'Manage own portions',
      'Create lesson plans',
      'Manage assessments',
      'View own progress',
      'Mark portions complete',
      'Manage projects',
    ],
  },
  {
    role: 'student',
    label: 'Student',
    description: 'Student access to view academic progress',
    icon: <GraduationCap className="h-5 w-5" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    permissions: [
      'View subjects',
      'View portion progress',
      'View grades',
      'View schedule',
      'View announcements',
    ],
  },
];

export default function RolesPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch user counts by role
      const { data: users } = await supabase
        .from('users')
        .select('role');

      const roleCounts: { [key: string]: number } = {};
      users?.forEach((user) => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
      });

      const rolesWithCounts: RoleInfo[] = roleDefinitions.map((role) => ({
        ...role,
        userCount: roleCounts[role.role] || 0,
      }));

      setRoles(rolesWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gradient">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">
            View system roles and their permissions
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role, index) => (
            <div
              key={role.role}
              className="glass-card rounded-2xl p-6 card-hover animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${role.color}`}>
                    {role.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{role.label}</h3>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Badge className={`${role.color} border`}>
                  {role.userCount} {role.userCount === 1 ? 'User' : 'Users'}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((perm, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Roles Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">Role Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 hover:bg-white/40">
                  <TableHead className="font-semibold text-gray-700">Role</TableHead>
                  <TableHead className="font-semibold text-gray-700">Description</TableHead>
                  <TableHead className="font-semibold text-gray-700">Users</TableHead>
                  <TableHead className="font-semibold text-gray-700">Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role, index) => (
                  <TableRow
                    key={role.role}
                    className="hover:bg-white/40 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${role.color}`}>
                          {role.icon}
                        </div>
                        <span className="font-medium text-gray-800">{role.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-xs">
                      {role.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${role.color} border`}>
                        {role.userCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {role.permissions.length} permissions
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
