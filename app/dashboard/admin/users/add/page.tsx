'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { Department, UserRole, User } from '@/types/database';
import { DEPARTMENTS } from '@/lib/constants';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

// All available roles
const allRoles: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'facilitator', label: 'Facilitator' },
  { value: 'student', label: 'Student' },
];

export default function AddUserPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: '' as UserRole | '',
    department_id: '',
    department_ids: [] as string[], // For facilitators - multiple departments
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchDepartments = useCallback(async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    if (data) {
      setDepartments(data);
    }
  }, [supabase]);

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (userData) {
        setCurrentUser(userData);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchDepartments();
    fetchCurrentUser();
  }, [fetchDepartments, fetchCurrentUser]);

  // Filter roles based on current user's role
  const availableRoles = allRoles.filter(role => {
    if (currentUser?.role === 'super_admin') {
      return true;
    }
    if (currentUser?.role === 'admin') {
      return role.value !== 'super_admin';
    }
    return false;
  });

  const handleDepartmentToggle = (departmentId: string) => {
    setFormData(prev => {
      const isSelected = prev.department_ids.includes(departmentId);
      if (isSelected) {
        return {
          ...prev,
          department_ids: prev.department_ids.filter(id => id !== departmentId),
        };
      } else {
        return {
          ...prev,
          department_ids: [...prev.department_ids, departmentId],
        };
      }
    });
  };

  const handleSelectAllDepartments = () => {
    const allDeptIds = departments.map(d => d.id);
    if (formData.department_ids.length === departments.length) {
      setFormData(prev => ({ ...prev, department_ids: [] }));
    } else {
      setFormData(prev => ({ ...prev, department_ids: allDeptIds }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate facilitator has at least one department
      if (formData.role === 'facilitator' && formData.department_ids.length === 0) {
        setError('Please select at least one department for the facilitator');
        setLoading(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData.user) {
        // For facilitators, use the first department as primary
        const primaryDeptId = formData.role === 'facilitator'
          ? formData.department_ids[0]
          : formData.role === 'student'
            ? formData.department_id
            : null;

        // Create user profile
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          department_id: primaryDeptId,
          is_active: true,
        });

        if (profileError) {
          if (profileError.message.includes('users_email_key')) {
            setError('A user with this email already exists. Please use a different email address.');
          } else {
            setError(profileError.message);
          }
          return;
        }

        // For facilitators, also add entries to user_departments table
        if (formData.role === 'facilitator' && formData.department_ids.length > 0) {
          const userDepartmentEntries = formData.department_ids.map(deptId => ({
            user_id: authData.user!.id,
            department_id: deptId,
          }));

          const { error: deptError } = await supabase
            .from('user_departments')
            .insert(userDepartmentEntries);

          if (deptError) {
            console.error('Error adding user departments:', deptError);
            // Don't fail the whole operation, just log it
          }
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/admin/users');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentList = departments.length > 0 ? departments : DEPARTMENTS.map(d => ({ id: d.code, name: d.name, code: d.code, hod_id: null, created_at: '' }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 animate-fade-in-up">
          <Link
            href="/dashboard/admin/users"
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Add New User</h1>
            <p className="text-muted-foreground mt-1">
              Create a new user account
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">User Created Successfully!</h3>
              <p className="text-muted-foreground mt-2">Redirecting to users list...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="John"
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Doe"
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john.doe@example.com"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as UserRole,
                      department_id: '',
                      department_ids: [],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Single Department Select for Students */}
              {formData.role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDepartmentList.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Multi-Select Departments for Facilitators */}
              {formData.role === 'facilitator' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Departments <span className="text-red-500">*</span></Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllDepartments}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      {formData.department_ids.length === getDepartmentList.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  {/* Selected Departments Badges */}
                  {formData.department_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                      {formData.department_ids.map(deptId => {
                        const dept = getDepartmentList.find(d => d.id === deptId);
                        return dept ? (
                          <Badge
                            key={deptId}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 pr-1"
                          >
                            {dept.name}
                            <button
                              type="button"
                              onClick={() => handleDepartmentToggle(deptId)}
                              className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Department Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    {getDepartmentList.map((dept) => {
                      const isSelected = formData.department_ids.includes(dept.id);
                      return (
                        <div
                          key={dept.id}
                          onClick={() => handleDepartmentToggle(dept.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400'
                              : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                              : 'border-2 border-gray-300'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-purple-700' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {dept.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Selected: {formData.department_ids.length} of {getDepartmentList.length} departments
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.role ||
                    (formData.role === 'student' && !formData.department_id) ||
                    (formData.role === 'facilitator' && formData.department_ids.length === 0)
                  }
                  className="flex-1 gradient-bg text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
