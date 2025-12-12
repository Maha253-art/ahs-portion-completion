'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  GraduationCap,
  Mail,
  Building2,
  Users,
} from 'lucide-react';
import { User, Department } from '@/types/database';
import { DEPARTMENTS } from '@/lib/constants';
import { StudentDashboardModal } from '@/components/dashboard/student-dashboard-modal';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface StudentWithDepartment extends User {
  department?: Department;
}

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentWithDepartment[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('role', 'student')
        .order('first_name', { ascending: true });

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (studentsData) {
        setStudents(studentsData);
        setFilteredStudents(studentsData);
      }

      if (departmentsData) {
        setDepartments(departmentsData);
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
    let filtered = [...students];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((student) => student.department_id === selectedDepartment);
    }

    setFilteredStudents(filtered);
  }, [searchQuery, selectedDepartment, students]);

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
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gradient">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view student information
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold text-gradient">{students.length}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Students</p>
              <p className="text-2xl font-bold text-gradient">
                {students.filter((s) => s.is_active).length}
              </p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Departments</p>
              <p className="text-2xl font-bold text-gradient">{departments.length}</p>
            </div>
          </div>
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

        {/* Students Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              Student List ({filteredStudents.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 hover:bg-white/40">
                  <TableHead className="font-semibold text-gray-700">Student</TableHead>
                  <TableHead className="font-semibold text-gray-700">Email</TableHead>
                  <TableHead className="font-semibold text-gray-700">Department</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No students found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, index) => (
                    <TableRow
                      key={student.id}
                      className="hover:bg-white/40 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {student.first_name} {student.last_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          {student.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {student.department?.name || 'Not Assigned'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.is_active ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 border-0">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            setSelectedStudent({
                              id: student.id,
                              name: `${student.first_name} ${student.last_name}`,
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Dashboard
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Student Dashboard Modal */}
      {selectedStudent && (
        <StudentDashboardModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </DashboardLayout>
  );
}
