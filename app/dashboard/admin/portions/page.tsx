'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Building2,
} from 'lucide-react';
import { Department, User, Portion } from '@/types/database';
import { format, isPast, isToday } from 'date-fns';

interface SubjectWithPortions {
  id: string;
  name: string;
  code: string;
  department?: Department;
  facilitator?: User;
  portions: Portion[];
  total_portions: number;
  completed_portions: number;
  overdue_portions: number;
  completion_percentage: number;
}

export default function AdminPortionsPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithPortions[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<SubjectWithPortions[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      // Fetch subjects with portions
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users!subjects_facilitator_id_fkey(*),
          portions(*)
        `)
        .eq('academic_year_id', academicYear?.id);

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (subjectsData) {
        const subjectsWithStats: SubjectWithPortions[] = subjectsData.map((subject) => {
          const portions = subject.portions || [];
          let completedCount = 0;
          let overdueCount = 0;

          portions.forEach((portion: Portion) => {
            if (portion.is_completed) {
              completedCount++;
            } else {
              const plannedDate = new Date(portion.planned_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              plannedDate.setHours(0, 0, 0, 0);

              if (isPast(plannedDate) && !isToday(plannedDate)) {
                overdueCount++;
              }
            }
          });

          return {
            ...subject,
            total_portions: portions.length,
            completed_portions: completedCount,
            overdue_portions: overdueCount,
            completion_percentage:
              portions.length > 0 ? Math.round((completedCount / portions.length) * 100) : 0,
          };
        });

        setSubjects(subjectsWithStats);
        setFilteredSubjects(subjectsWithStats);
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
    let filtered = [...subjects];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (subject) =>
          subject.name.toLowerCase().includes(query) ||
          subject.code.toLowerCase().includes(query) ||
          subject.facilitator?.first_name?.toLowerCase().includes(query) ||
          subject.facilitator?.last_name?.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((subject) => subject.department?.id === selectedDepartment);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((subject) => {
        switch (selectedStatus) {
          case 'on-track':
            return subject.completion_percentage >= 80;
          case 'moderate':
            return subject.completion_percentage >= 50 && subject.completion_percentage < 80;
          case 'behind':
            return subject.completion_percentage < 50;
          case 'overdue':
            return subject.overdue_portions > 0;
          default:
            return true;
        }
      });
    }

    setFilteredSubjects(filtered);
  }, [searchQuery, selectedDepartment, selectedStatus, subjects]);

  const totalPortions = subjects.reduce((sum, s) => sum + s.total_portions, 0);
  const completedPortions = subjects.reduce((sum, s) => sum + s.completed_portions, 0);
  const overduePortions = subjects.reduce((sum, s) => sum + s.overdue_portions, 0);
  const pendingPortions = totalPortions - completedPortions;

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
          <h1 className="text-3xl font-bold text-gradient">All Portions</h1>
          <p className="text-muted-foreground mt-1">
            Overview of all subject portions across departments
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Portions</p>
              <p className="text-2xl font-bold text-gradient">{totalPortions}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-gradient">{completedPortions}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-gradient">{pendingPortions}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-gradient">{overduePortions}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, code, or facilitator..."
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
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="on-track">On Track (80%+)</SelectItem>
                <SelectItem value="moderate">Moderate (50-80%)</SelectItem>
                <SelectItem value="behind">Behind (&lt;50%)</SelectItem>
                <SelectItem value="overdue">Has Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              Subjects & Portions ({filteredSubjects.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subject</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Department</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Facilitator</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Progress</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Overdue</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No subjects found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject, index) => (
                    <TableRow
                      key={subject.id}
                      className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700"
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          {subject.department?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subject.facilitator ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                              {subject.facilitator.first_name?.[0]}
                              {subject.facilitator.last_name?.[0]}
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {subject.facilitator.first_name} {subject.facilitator.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <Progress value={subject.completion_percentage} className="h-2" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {subject.completed_portions}/{subject.total_portions}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {subject.overdue_portions > 0 ? (
                          <Badge variant="destructive" className="animate-pulse">
                            {subject.overdue_portions}
                          </Badge>
                        ) : (
                          <span className="text-green-500 font-medium">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subject.completion_percentage >= 80 ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white">
                            On Track
                          </Badge>
                        ) : subject.completion_percentage >= 50 ? (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 border-0 text-white">
                            Moderate
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 border-0 text-white">
                            Behind
                          </Badge>
                        )}
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
