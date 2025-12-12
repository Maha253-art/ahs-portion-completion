'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  Users,
  Mail,
  Building2,
  BookOpen,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { User, Department, Portion } from '@/types/database';
import { DEPARTMENTS } from '@/lib/constants';
import { FacilitatorDashboardModal } from '@/components/dashboard/facilitator-dashboard-modal';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { isPast, isToday } from 'date-fns';

interface FacilitatorWithStats extends User {
  department?: Department;
  subjects_count: number;
  total_portions: number;
  completed_portions: number;
  overdue_portions: number;
  completion_percentage: number;
}

export default function FacilitatorsPage() {
  const [loading, setLoading] = useState(true);
  const [facilitators, setFacilitators] = useState<FacilitatorWithStats[]>([]);
  const [filteredFacilitators, setFilteredFacilitators] = useState<FacilitatorWithStats[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedFacilitator, setSelectedFacilitator] = useState<{ id: string; name: string } | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      // Fetch facilitators
      const { data: facilitatorsData } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('role', 'facilitator')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      // Fetch departments
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      // Fetch subjects with portions for stats
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          facilitator_id,
          portions(*)
        `)
        .eq('academic_year_id', academicYear?.id);

      if (facilitatorsData && departmentsData) {
        // Calculate stats for each facilitator
        const facilitatorsWithStats: FacilitatorWithStats[] = facilitatorsData.map((fac) => {
          const facSubjects = subjects?.filter((s) => s.facilitator_id === fac.id) || [];
          let totalPortions = 0;
          let completedPortions = 0;
          let overduePortions = 0;

          facSubjects.forEach((subject) => {
            const portions = subject.portions || [];
            totalPortions += portions.length;

            portions.forEach((portion: Portion) => {
              if (portion.is_completed) {
                completedPortions++;
              } else {
                const plannedDate = new Date(portion.planned_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                plannedDate.setHours(0, 0, 0, 0);

                if (isPast(plannedDate) && !isToday(plannedDate)) {
                  overduePortions++;
                }
              }
            });
          });

          return {
            ...fac,
            subjects_count: facSubjects.length,
            total_portions: totalPortions,
            completed_portions: completedPortions,
            overdue_portions: overduePortions,
            completion_percentage: totalPortions > 0
              ? Math.round((completedPortions / totalPortions) * 100)
              : 0,
          };
        });

        setFacilitators(facilitatorsWithStats);
        setFilteredFacilitators(facilitatorsWithStats);
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
    let filtered = [...facilitators];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fac) =>
          fac.first_name.toLowerCase().includes(query) ||
          fac.last_name.toLowerCase().includes(query) ||
          fac.email.toLowerCase().includes(query)
      );
    }

    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter((fac) => fac.department_id === selectedDepartment);
    }

    setFilteredFacilitators(filtered);
  }, [searchQuery, selectedDepartment, facilitators]);

  const totalCompleted = facilitators.reduce((sum, f) => sum + f.completed_portions, 0);
  const totalPortions = facilitators.reduce((sum, f) => sum + f.total_portions, 0);
  const totalOverdue = facilitators.reduce((sum, f) => sum + f.overdue_portions, 0);

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
          <h1 className="text-3xl font-bold text-gradient">Facilitators</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view facilitator performance
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Facilitators</p>
              <p className="text-2xl font-bold text-gradient">{facilitators.length}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
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
              <p className="text-2xl font-bold text-gradient">{totalCompleted}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-gradient">{totalOverdue}</p>
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

        {/* Facilitators Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/30">
            <h3 className="text-lg font-semibold text-gradient">
              Facilitator List ({filteredFacilitators.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/30 hover:bg-white/40">
                  <TableHead className="font-semibold text-gray-700">Facilitator</TableHead>
                  <TableHead className="font-semibold text-gray-700">Department</TableHead>
                  <TableHead className="font-semibold text-gray-700">Subjects</TableHead>
                  <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                  <TableHead className="font-semibold text-gray-700">Overdue</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacilitators.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-muted-foreground">No facilitators found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacilitators.map((fac, index) => (
                    <TableRow
                      key={fac.id}
                      className="hover:bg-white/40 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {fac.first_name?.[0]}{fac.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {fac.first_name} {fac.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {fac.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {fac.department?.name || 'Not Assigned'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">{fac.subjects_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-24">
                            <Progress value={fac.completion_percentage} className="h-2" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">
                            {fac.completion_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {fac.overdue_portions > 0 ? (
                          <Badge variant="destructive" className="animate-pulse">
                            {fac.overdue_portions}
                          </Badge>
                        ) : (
                          <span className="text-green-500 font-medium">✓</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fac.completion_percentage >= 80 ? (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">
                            On Track
                          </Badge>
                        ) : fac.completion_percentage >= 50 ? (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 border-0">
                            Moderate
                          </Badge>
                        ) : (
                          <Badge className="bg-gradient-to-r from-red-500 to-rose-500 border-0">
                            Behind
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            setSelectedFacilitator({
                              id: fac.id,
                              name: `${fac.first_name} ${fac.last_name}`,
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

      {/* Facilitator Dashboard Modal */}
      {selectedFacilitator && (
        <FacilitatorDashboardModal
          facilitatorId={selectedFacilitator.id}
          facilitatorName={selectedFacilitator.name}
          isOpen={!!selectedFacilitator}
          onClose={() => setSelectedFacilitator(null)}
        />
      )}
    </DashboardLayout>
  );
}
