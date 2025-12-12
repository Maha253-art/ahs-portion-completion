'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Building2,
  Users,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { FacilitatorDashboardModal } from '@/components/dashboard/facilitator-dashboard-modal';
import { AdminStats, DepartmentWithStats, User, Portion } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format, isPast, isToday, addDays } from 'date-fns';
import { DonutChart } from '@/components/charts/donut-chart';
import { BarChart } from '@/components/charts/bar-chart';
import { EventCalendar, CalendarEvent } from '@/components/calendar/event-calendar';

interface FacilitatorWithStats extends User {
  subjects_count: number;
  total_portions: number;
  completed_portions: number;
  overdue_portions: number;
  completion_percentage: number;
  department_name: string;
}

interface OverduePortion {
  id: string;
  name: string;
  planned_date: string;
  days_overdue: number;
  facilitator_name: string;
  subject_name: string;
  department_name: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    total_departments: 0,
    total_facilitators: 0,
    total_subjects: 0,
    total_portions: 0,
    completed_portions: 0,
    overdue_portions: 0,
    completion_percentage: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentWithStats[]>([]);
  const [facilitatorStats, setFacilitatorStats] = useState<FacilitatorWithStats[]>([]);
  const [overduePortions, setOverduePortions] = useState<OverduePortion[]>([]);
  const [selectedFacilitator, setSelectedFacilitator] = useState<{ id: string; name: string } | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!academicYear) {
        setLoading(false);
        return;
      }

      // Fetch departments
      const { data: departments } = await supabase
        .from('departments')
        .select('*');

      // Fetch all subjects with portions and facilitators
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(*),
          portions(*)
        `)
        .eq('academic_year_id', academicYear.id);

      // Fetch all facilitators
      const { data: facilitators } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('role', 'facilitator')
        .eq('is_active', true);

      if (departments && subjects && facilitators) {
        // Calculate overall stats
        let totalPortions = 0;
        let completedPortions = 0;
        let overdueCount = 0;
        const overdueList: OverduePortion[] = [];

        // Department stats calculation
        const deptStatsMap: { [key: string]: DepartmentWithStats } = {};
        departments.forEach((dept) => {
          deptStatsMap[dept.id] = {
            ...dept,
            total_portions: 0,
            completed_portions: 0,
            completion_percentage: 0,
            facilitator_count: 0,
            subject_count: 0,
          };
        });

        // Facilitator stats calculation
        const facilitatorStatsMap: { [key: string]: FacilitatorWithStats } = {};
        facilitators.forEach((fac) => {
          facilitatorStatsMap[fac.id] = {
            ...fac,
            subjects_count: 0,
            total_portions: 0,
            completed_portions: 0,
            overdue_portions: 0,
            completion_percentage: 0,
            department_name: fac.department?.name || 'Unknown',
          };
        });

        subjects.forEach((subject) => {
          const portions = subject.portions || [];
          const deptId = subject.department_id;
          const facId = subject.facilitator_id;

          // Update department stats
          if (deptStatsMap[deptId]) {
            deptStatsMap[deptId].subject_count++;
          }

          // Update facilitator stats
          if (facilitatorStatsMap[facId]) {
            facilitatorStatsMap[facId].subjects_count++;
          }

          portions.forEach((portion: Portion) => {
            totalPortions++;

            // Update department stats
            if (deptStatsMap[deptId]) {
              deptStatsMap[deptId].total_portions++;
            }

            // Update facilitator stats
            if (facilitatorStatsMap[facId]) {
              facilitatorStatsMap[facId].total_portions++;
            }

            if (portion.is_completed) {
              completedPortions++;
              if (deptStatsMap[deptId]) {
                deptStatsMap[deptId].completed_portions++;
              }
              if (facilitatorStatsMap[facId]) {
                facilitatorStatsMap[facId].completed_portions++;
              }
            } else {
              const plannedDate = new Date(portion.planned_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              plannedDate.setHours(0, 0, 0, 0);

              if (isPast(plannedDate) && !isToday(plannedDate)) {
                overdueCount++;
                if (facilitatorStatsMap[facId]) {
                  facilitatorStatsMap[facId].overdue_portions++;
                }

                const daysOverdue = Math.ceil(
                  (today.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                overdueList.push({
                  id: portion.id,
                  name: portion.name,
                  planned_date: portion.planned_date,
                  days_overdue: daysOverdue,
                  facilitator_name: `${subject.facilitator?.first_name || ''} ${
                    subject.facilitator?.last_name || ''
                  }`.trim(),
                  subject_name: subject.name,
                  department_name: subject.department?.name || 'Unknown',
                });
              }
            }
          });
        });

        // Calculate completion percentages
        Object.keys(deptStatsMap).forEach((deptId) => {
          const dept = deptStatsMap[deptId];
          dept.completion_percentage =
            dept.total_portions > 0
              ? Math.round((dept.completed_portions / dept.total_portions) * 100)
              : 0;
          dept.facilitator_count = facilitators.filter(
            (f) => f.department_id === deptId
          ).length;
        });

        Object.keys(facilitatorStatsMap).forEach((facId) => {
          const fac = facilitatorStatsMap[facId];
          fac.completion_percentage =
            fac.total_portions > 0
              ? Math.round((fac.completed_portions / fac.total_portions) * 100)
              : 0;
        });

        const completionPercentage =
          totalPortions > 0 ? Math.round((completedPortions / totalPortions) * 100) : 0;

        setStats({
          total_departments: departments.length,
          total_facilitators: facilitators.length,
          total_subjects: subjects.length,
          total_portions: totalPortions,
          completed_portions: completedPortions,
          overdue_portions: overdueCount,
          completion_percentage: completionPercentage,
        });

        // Sort departments by completion percentage
        const sortedDeptStats = Object.values(deptStatsMap)
          .filter((d) => d.total_portions > 0)
          .sort((a, b) => b.completion_percentage - a.completion_percentage);

        // Sort facilitators by completion percentage
        const sortedFacStats = Object.values(facilitatorStatsMap)
          .filter((f) => f.total_portions > 0)
          .sort((a, b) => b.completion_percentage - a.completion_percentage);

        // Sort overdue portions by days overdue
        overdueList.sort((a, b) => b.days_overdue - a.days_overdue);

        setDepartmentStats(sortedDeptStats);
        setFacilitatorStats(sortedFacStats);
        setOverduePortions(overdueList);

        // Generate calendar events from upcoming deadlines
        const events: CalendarEvent[] = [];
        subjects.forEach((subject) => {
          const portions = subject.portions || [];
          portions.forEach((portion: Portion) => {
            if (!portion.is_completed) {
              events.push({
                id: portion.id,
                title: `${portion.name} - ${subject.name}`,
                date: new Date(portion.planned_date),
                type: isPast(new Date(portion.planned_date)) ? 'deadline' : 'other',
              });
            }
          });
        });
        setCalendarEvents(events);
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
          <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of academic progress across all departments
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Departments"
            value={stats.total_departments}
            icon={<Building2 className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Facilitators"
            value={stats.total_facilitators}
            icon={<Users className="h-6 w-6" />}
            gradient="brand-yellow"
          />
          <StatCard
            title="Subjects"
            value={stats.total_subjects}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Overdue Portions"
            value={stats.overdue_portions}
            icon={<AlertTriangle className="h-6 w-6" />}
            gradient="red"
          />
        </div>

        {/* Overall progress */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Completion Progress</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {stats.completed_portions} of {stats.total_portions} portions completed
              </span>
              <span className="text-3xl font-bold text-gradient">{stats.completion_percentage}%</span>
            </div>
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-1000"
                style={{ width: `${stats.completion_percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="glass-card rounded-2xl p-6">
          <TabsList className="bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 rounded-xl p-1 mb-6 flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">Overview</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <Calendar className="h-4 w-4 mr-1" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="facilitators" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">Facilitators</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              Overdue
              {stats.overdue_portions > 0 && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  {stats.overdue_portions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <h3 className="text-lg font-semibold text-gradient">Department Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departmentStats.map((dept, index) => (
                <div key={dept.id} className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-4 card-hover animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{dept.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {dept.facilitator_count} facilitators · {dept.subject_count} subjects
                      </p>
                    </div>
                    <div className="flex items-center">
                      {dept.completion_percentage >= 80 ? (
                        <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                      ) : dept.completion_percentage < 50 ? (
                        <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                      ) : null}
                      <span className="text-2xl font-bold text-gradient">
                        {dept.completion_percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-700"
                      style={{ width: `${dept.completion_percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dept.completed_portions}/{dept.total_portions} portions completed
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Completion Donut */}
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center">
                <h3 className="text-lg font-semibold text-gradient mb-4">Overall Completion</h3>
                <DonutChart
                  value={stats.completed_portions}
                  maxValue={stats.total_portions}
                  size={150}
                  strokeWidth={15}
                  label="Complete"
                  sublabel={`${stats.completed_portions}/${stats.total_portions}`}
                  color="stroke-green-500"
                />
              </div>

              {/* Department Bar Chart */}
              <div className="lg:col-span-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-6">
                <BarChart
                  title="Department Completion Rate"
                  data={departmentStats.slice(0, 6).map(dept => ({
                    label: dept.name.length > 10 ? dept.name.substring(0, 10) + '...' : dept.name,
                    value: dept.completion_percentage,
                  }))}
                  height={200}
                />
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-6 text-center">
                <DonutChart
                  value={stats.total_portions - stats.overdue_portions - stats.completed_portions}
                  maxValue={stats.total_portions}
                  size={100}
                  strokeWidth={10}
                  label="Pending"
                  color="stroke-blue-500"
                />
                <p className="text-sm text-muted-foreground mt-2">On Schedule</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-6 text-center">
                <DonutChart
                  value={stats.overdue_portions}
                  maxValue={stats.total_portions}
                  size={100}
                  strokeWidth={10}
                  label="Overdue"
                  color="stroke-red-500"
                />
                <p className="text-sm text-muted-foreground mt-2">Needs Attention</p>
              </div>
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl p-6 text-center">
                <DonutChart
                  value={stats.completed_portions}
                  maxValue={stats.total_portions}
                  size={100}
                  strokeWidth={10}
                  label="Done"
                  color="stroke-green-500"
                />
                <p className="text-sm text-muted-foreground mt-2">Completed</p>
              </div>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <EventCalendar events={calendarEvents} />
          </TabsContent>

          <TabsContent value="facilitators">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/30 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gradient">Facilitator Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Facilitator</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Department</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subjects</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Progress</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Overdue</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilitatorStats.map((fac, index) => (
                      <TableRow key={fac.id} className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <TableCell className="font-medium text-gray-800 dark:text-gray-100">
                          {fac.first_name} {fac.last_name}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{fac.department_name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{fac.subjects_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-500"
                                style={{ width: `${fac.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              {fac.completion_percentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {fac.overdue_portions > 0 ? (
                            <Badge variant="destructive" className="animate-pulse">{fac.overdue_portions}</Badge>
                          ) : (
                            <span className="text-green-500 font-medium">✓</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {fac.completion_percentage >= 80 ? (
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white">On Track</Badge>
                          ) : fac.completion_percentage >= 50 ? (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 border-0 text-white">Moderate</Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-red-500 to-rose-500 border-0 text-white">Behind</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedFacilitator({ id: fac.id, name: `${fac.first_name} ${fac.last_name}` })}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#0b6d41] dark:text-[#fbbe00] bg-[#0b6d41]/10 dark:bg-[#0b6d41]/30 hover:bg-[#0b6d41]/20 dark:hover:bg-[#0b6d41]/50 rounded-lg transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overdue">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/30 dark:border-gray-700 flex items-center">
                <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 mr-3">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Attention Required ({overduePortions.length} Overdue Portions)
                </h3>
              </div>
              <div className="p-4">
                {overduePortions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                      <span className="text-2xl text-white">✓</span>
                    </div>
                    <p className="text-muted-foreground">
                      No overdue portions. Great job!
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Facilitator</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subject</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Portion</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Department</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Planned Date</TableHead>
                          <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Days Overdue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overduePortions.map((portion, index) => (
                          <TableRow key={portion.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <TableCell className="font-medium text-gray-800 dark:text-gray-100">
                              {portion.facilitator_name}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{portion.subject_name}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{portion.name}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">{portion.department_name}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {format(new Date(portion.planned_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-gradient-to-r from-red-500 to-rose-500 border-0 text-white animate-pulse">
                                {portion.days_overdue} days
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
