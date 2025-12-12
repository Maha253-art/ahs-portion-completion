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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Search,
  Plus,
  Building2,
  Users,
  BookOpen,
  Edit,
  Trash2,
} from 'lucide-react';
import { Department, User } from '@/types/database';
import { DEPARTMENTS } from '@/lib/constants';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { toast } from 'sonner';

interface DepartmentWithStats extends Department {
  facilitator_count: number;
  student_count: number;
  subject_count: number;
}

export default function DepartmentsPage() {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentWithStats[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<DepartmentWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (deptError) {
        console.error('Error fetching departments:', deptError);
      }
      console.log('Departments data:', deptData);

      // Fetch users to count facilitators and students per department
      const { data: usersData } = await supabase
        .from('users')
        .select('department_id, role');

      // Fetch subjects to count per department
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('department_id');

      if (deptData) {
        const departmentsWithStats: DepartmentWithStats[] = deptData.map((dept) => {
          const deptUsers = usersData?.filter((u) => u.department_id === dept.id) || [];
          const facilitatorCount = deptUsers.filter(
            (u) => u.role === 'facilitator' || u.role === 'hod'
          ).length;
          const studentCount = deptUsers.filter((u) => u.role === 'student').length;
          const subjectCount = subjectsData?.filter((s) => s.department_id === dept.id).length || 0;

          return {
            ...dept,
            facilitator_count: facilitatorCount,
            student_count: studentCount,
            subject_count: subjectCount,
          };
        });

        setDepartments(departmentsWithStats);
        setFilteredDepartments(departmentsWithStats);
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
    let filtered = [...departments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dept) =>
          dept.name.toLowerCase().includes(query) ||
          dept.description?.toLowerCase().includes(query)
      );
    }

    setFilteredDepartments(filtered);
  }, [searchQuery, departments]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name,
            code: formData.code,
          })
          .eq('id', editingDepartment.id);

        if (error) {
          toast.error('Failed to update department');
          return;
        }
        toast.success('Department updated successfully!');
      } else {
        const { error } = await supabase.from('departments').insert({
          name: formData.name,
          code: formData.code,
        });

        if (error) {
          if (error.code === '23505') {
            toast.error('A department with this code already exists');
          } else {
            toast.error('Failed to create department');
          }
          return;
        }
        toast.success('Department created successfully!');
      }

      setIsDialogOpen(false);
      setEditingDepartment(null);
      setFormData({ name: '', code: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({ name: dept.name, code: dept.code || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      await supabase.from('departments').delete().eq('id', id);
      fetchData();
    } catch (error) {
      console.error('Error deleting department:', error);
    }
  };

  const openNewDialog = () => {
    setEditingDepartment(null);
    setFormData({ name: '', code: '' });
    setIsDialogOpen(true);
  };

  const totalFacilitators = departments.reduce((sum, d) => sum + d.facilitator_count, 0);
  const totalStudents = departments.reduce((sum, d) => sum + d.student_count, 0);
  const totalSubjects = departments.reduce((sum, d) => sum + d.subject_count, 0);

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
            <h1 className="text-3xl font-bold text-gradient">Departments</h1>
            <p className="text-muted-foreground mt-1">
              Manage academic departments
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white" onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Department
                </Button>
              </DialogTrigger>
            <DialogContent className="glass-card">
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </DialogTitle>
                <DialogDescription>
                  {editingDepartment
                    ? 'Update the department details below.'
                    : 'Enter the details for the new department.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Department Name *</Label>
                  <Select
                    value={formData.name}
                    onValueChange={(value) => {
                      const dept = DEPARTMENTS.find(d => d.name === value);
                      setFormData({
                        name: value,
                        code: dept?.code || formData.code
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.code} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Department Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., BSC-CT"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !formData.name.trim() || !formData.code.trim()}
                  className="gradient-bg text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingDepartment ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Departments</p>
              <p className="text-2xl font-bold text-gradient">{departments.length}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Facilitators</p>
              <p className="text-2xl font-bold text-gradient">{totalFacilitators}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold text-gradient">{totalStudents}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Subjects</p>
              <p className="text-2xl font-bold text-gradient">{totalSubjects}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="glass-card rounded-2xl p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Departments Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              Department List ({filteredDepartments.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Department</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Code</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Facilitators</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Students</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subjects</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No departments found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map((dept, index) => (
                    <TableRow
                      key={dept.id}
                      className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <span className="font-medium text-gray-800 dark:text-gray-100">{dept.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 font-mono">
                          {dept.code || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                          {dept.facilitator_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                          {dept.student_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                          {dept.subject_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(dept)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
