'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  UserPlus,
  Mail,
  Users,
  Shield,
  GraduationCap,
  Trash2,
  UserCog,
} from 'lucide-react';
import { User, Department, UserRole } from '@/types/database';
import { DEPARTMENTS } from '@/lib/constants';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { ExportButton } from '@/components/export/export-button';
import Link from 'next/link';

interface UserWithDepartments extends User {
  department?: Department;
  departments?: Department[]; // Multiple departments for facilitators
}

const roleColors: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  facilitator: 'bg-blue-100 text-blue-700 border-blue-200',
  student: 'bg-orange-100 text-orange-700 border-orange-200',
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  super_admin: <Shield className="h-4 w-4" />,
  admin: <UserCog className="h-4 w-4" />,
  facilitator: <Users className="h-4 w-4" />,
  student: <GraduationCap className="h-4 w-4" />,
};

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithDepartments[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithDepartments[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch departments first
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (deptError) {
        console.error('Error fetching departments:', deptError);
      }

      if (departmentsData) {
        setDepartments(departmentsData);
      }

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch user_departments for all facilitators
      const { data: userDepartmentsData, error: userDeptError } = await supabase
        .from('user_departments')
        .select('*');

      if (userDeptError) {
        console.error('Error fetching user departments:', userDeptError);
      }

      if (usersData && departmentsData) {
        // Build a map of user_id to department IDs
        const userDeptMap: Record<string, string[]> = {};
        if (userDepartmentsData) {
          userDepartmentsData.forEach((ud: any) => {
            if (!userDeptMap[ud.user_id]) {
              userDeptMap[ud.user_id] = [];
            }
            userDeptMap[ud.user_id].push(ud.department_id);
          });
        }

        // Manually join department data
        const usersWithDept = usersData.map(user => {
          // Get primary department
          const primaryDept = departmentsData.find(d => d.id === user.department_id) || null;

          // Get all departments for facilitators
          let userDepartments: Department[] = [];
          if (user.role === 'facilitator' && userDeptMap[user.id]) {
            userDepartments = userDeptMap[user.id]
              .map(deptId => departmentsData.find(d => d.id === deptId))
              .filter((d): d is Department => d !== undefined);
          }

          // If no user_departments entries but has primary department, use that
          if (userDepartments.length === 0 && primaryDept) {
            userDepartments = [primaryDept];
          }

          return {
            ...user,
            department: primaryDept,
            departments: userDepartments,
          };
        });

        setUsers(usersWithDept);
        setFilteredUsers(usersWithDept);
      } else if (usersData) {
        setUsers(usersData);
        setFilteredUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = [...users];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.first_name.toLowerCase().includes(query) ||
          user.last_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    // Filter by department (check both primary and all departments)
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((user) => {
        // Check primary department
        if (user.department_id === selectedDepartment) return true;
        // Check all departments for facilitators
        if (user.departments && user.departments.some(d => d.id === selectedDepartment)) return true;
        return false;
      });
    }

    setFilteredUsers(filtered);
  }, [searchQuery, selectedRole, selectedDepartment, users]);

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      // First delete from user_departments
      await supabase
        .from('user_departments')
        .delete()
        .eq('user_id', userId);

      // Then delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      } else {
        // Remove user from local state
        setUsers(prev => prev.filter(u => u.id !== userId));
        setFilteredUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingScreen variant="minimal" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-gradient">All Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage system users and their roles
            </p>
          </div>
          <div className="flex gap-2">
            <ExportButton
              filename="users-report"
              getData={async () => ({
                title: 'Users Report',
                headers: ['Name', 'Email', 'Role', 'Department(s)', 'Status', 'Joined'],
                rows: filteredUsers.map(user => [
                  `${user.first_name} ${user.last_name}`,
                  user.email,
                  formatRole(user.role),
                  user.departments && user.departments.length > 0
                    ? user.departments.map(d => d.name).join(', ')
                    : user.department?.name || 'N/A',
                  user.is_active ? 'Active' : 'Inactive',
                  new Date(user.created_at).toLocaleDateString(),
                ]),
              })}
            />
            <Link href="/dashboard/admin/users/add">
              <Button className="gradient-bg text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['super_admin', 'admin', 'facilitator', 'student'] as UserRole[]).map((role) => (
            <div
              key={role}
              className="glass-card rounded-2xl p-4 flex items-center gap-3"
            >
              <div className={`p-2 rounded-lg ${roleColors[role]}`}>
                {roleIcons[role]}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{formatRole(role)}</p>
                <p className="text-xl font-bold text-gradient">{roleCounts[role] || 0}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="facilitator">Facilitator</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))
                ) : (
                  DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              User List ({filteredUsers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">User</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Role</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Department(s)</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Joined</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-100">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${roleColors[user.role]} border`}>
                          <span className="mr-1">{roleIcons[user.role]}</span>
                          {formatRole(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.departments && user.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {user.departments.map((dept, idx) => (
                              <Badge
                                key={dept.id}
                                variant="outline"
                                className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-xs"
                              >
                                {dept.name}
                              </Badge>
                            ))}
                          </div>
                        ) : user.department ? (
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                            {user.department.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={deletingUserId === user.id}
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
