'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  BookOpen,
  CheckCircle,
  Clock,
  GraduationCap,
  Calendar,
  Bell,
  ClipboardCheck,
  TrendingUp,
  FolderKanban,
  Target,
  Award,
  Zap,
  ArrowRight,
  Sparkles,
  Trophy,
  Flame,
} from 'lucide-react';
import { SubjectWithRelations, Portion, StudentStats } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format, isPast, isToday, addDays } from 'date-fns';
import { DonutChart } from '@/components/charts/donut-chart';
import Link from 'next/link';

interface SubjectProgress {
  subject: SubjectWithRelations;
  total_portions: number;
  completed_portions: number;
  completion_percentage: number;
}

interface UpcomingDeadline {
  name: string;
  subject: string;
  date: string;
  daysUntil: number;
  type: 'portion' | 'assessment' | 'project';
}

interface GradeEntry {
  subject_name: string;
  assessment_type: string;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  graded_at: string;
}

interface ScheduleEntry {
  subject_name: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

interface ProjectEntry {
  id: string;
  title: string;
  subject_name: string;
  type: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<StudentStats>({
    total_subjects: 0,
    total_portions: 0,
    completed_portions: 0,
    completion_percentage: 0,
    upcoming_assessments: 0,
    pending_assignments: 0,
  });
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [announcements, setAnnouncements] = useState<{ title: string; content: string; date: string }[]>([]);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, department_id')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUserName(`${userData.first_name} ${userData.last_name}`);
      }

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

      // Fetch student enrollments and subjects
      // For demo purposes, we'll fetch all subjects in the student's department
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          facilitator:users(first_name, last_name),
          portions(*)
        `)
        .eq('academic_year_id', academicYear.id)
        .eq('department_id', userData?.department_id);

      if (subjects) {
        let totalPortions = 0;
        let completedPortions = 0;
        const progress: SubjectProgress[] = [];
        const upcoming: UpcomingDeadline[] = [];

        subjects.forEach((subject) => {
          const portions = subject.portions || [];
          const subjectCompleted = portions.filter((p: Portion) => p.is_completed).length;
          const subjectTotal = portions.length;

          totalPortions += subjectTotal;
          completedPortions += subjectCompleted;

          progress.push({
            subject,
            total_portions: subjectTotal,
            completed_portions: subjectCompleted,
            completion_percentage: subjectTotal > 0
              ? Math.round((subjectCompleted / subjectTotal) * 100)
              : 0,
          });

          // Get upcoming deadlines
          portions.forEach((portion: Portion) => {
            if (!portion.is_completed) {
              const plannedDate = new Date(portion.planned_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              plannedDate.setHours(0, 0, 0, 0);

              const sevenDaysFromNow = addDays(today, 7);
              if (plannedDate >= today && plannedDate <= sevenDaysFromNow) {
                const daysUntil = Math.ceil(
                  (plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                upcoming.push({
                  name: portion.name,
                  subject: subject.name,
                  date: portion.planned_date,
                  daysUntil,
                  type: 'portion',
                });
              }
            }
          });
        });

        // Sort progress by completion percentage
        progress.sort((a, b) => b.completion_percentage - a.completion_percentage);

        // Sort upcoming by days until
        upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

        const completionPercentage = totalPortions > 0
          ? Math.round((completedPortions / totalPortions) * 100)
          : 0;

        setStats({
          total_subjects: subjects.length,
          total_portions: totalPortions,
          completed_portions: completedPortions,
          completion_percentage: completionPercentage,
          upcoming_assessments: 0, // Would need assessment data
          pending_assignments: 0, // Would need assignment data
        });

        setSubjectProgress(progress);
        setUpcomingDeadlines(upcoming.slice(0, 5));

        // Demo grades data
        setGrades([
          { subject_name: 'Mathematics', assessment_type: 'IA 1', marks_obtained: 18, max_marks: 20, percentage: 90, graded_at: '2024-03-15' },
          { subject_name: 'Physics', assessment_type: 'IA 1', marks_obtained: 16, max_marks: 20, percentage: 80, graded_at: '2024-03-14' },
          { subject_name: 'Chemistry', assessment_type: 'IA 1', marks_obtained: 17, max_marks: 20, percentage: 85, graded_at: '2024-03-13' },
        ]);

        // Demo projects data
        setProjects([
          { id: '1', title: 'Case Study: Market Analysis', subject_name: 'Economics', type: 'Case Study', due_date: '2024-04-15', status: 'in_progress', description: 'Analyze market trends in the tech sector' },
          { id: '2', title: 'Seminar: Climate Change Impact', subject_name: 'Environmental Science', type: 'Seminar', due_date: '2024-04-20', status: 'pending', description: 'Present findings on climate change effects' },
          { id: '3', title: 'Reportage: Local Business Survey', subject_name: 'Business Studies', type: 'Reportage', due_date: '2024-03-30', status: 'completed', description: 'Survey and report on local business landscape' },
        ]);

        // Demo schedule data
        setSchedule([
          { subject_name: 'Mathematics', day: 'Monday', start_time: '09:00', end_time: '10:00', room: 'Room 101' },
          { subject_name: 'Physics', day: 'Monday', start_time: '10:00', end_time: '11:00', room: 'Lab 1' },
          { subject_name: 'Chemistry', day: 'Tuesday', start_time: '09:00', end_time: '10:00', room: 'Lab 2' },
          { subject_name: 'English', day: 'Tuesday', start_time: '11:00', end_time: '12:00', room: 'Room 102' },
        ]);

        // Demo announcements
        setAnnouncements([
          { title: 'Mid-term exams schedule released', content: 'Check the notice board for detailed schedule.', date: '2024-03-20' },
          { title: 'Library hours extended', content: 'Library will remain open till 8 PM during exams.', date: '2024-03-18' },
        ]);
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
        {/* Welcome message with motivation */}
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gradient">Welcome, {userName}</h1>
            {stats.completion_percentage >= 80 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse">
                <Trophy className="h-4 w-4 text-white" />
                <span className="text-xs font-semibold text-white">Top Performer!</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Track your academic progress and stay updated
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <Link href="/dashboard/announcements" className="glass-card rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300 group cursor-pointer float-card">
            <div className="p-2 rounded-lg bg-[#0b6d41] group-hover:scale-110 transition-transform">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">Announcements</p>
              <p className="text-xs text-muted-foreground">View latest</p>
            </div>
          </Link>
          <Link href="/dashboard/settings" className="glass-card rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300 group cursor-pointer float-card">
            <div className="p-2 rounded-lg bg-[#fbbe00] group-hover:scale-110 transition-transform">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">My Goals</p>
              <p className="text-xs text-muted-foreground">Set targets</p>
            </div>
          </Link>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300 group cursor-pointer float-card">
            <div className="p-2 rounded-lg bg-[#0b6d41] group-hover:scale-110 transition-transform">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">Achievements</p>
              <p className="text-xs text-muted-foreground">{grades.length} earned</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 hover:shadow-lg transition-all duration-300 group cursor-pointer float-card">
            <div className="p-2 rounded-lg bg-[#fbbe00] group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">Streak</p>
              <p className="text-xs text-muted-foreground">7 days active</p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Enrolled Subjects"
            value={stats.total_subjects}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Assessments"
            value={grades.length}
            subtitle="completed"
            icon={<ClipboardCheck className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Projects"
            value={projects.length}
            subtitle={`${projects.filter(p => p.status === 'completed').length} completed`}
            icon={<FolderKanban className="h-6 w-6" />}
            gradient="brand-yellow"
          />
          <StatCard
            title="Pending Tasks"
            value={projects.filter(p => p.status !== 'completed').length}
            icon={<Clock className="h-6 w-6" />}
            gradient="brand-yellow"
          />
        </div>

        {/* Progress Overview with Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Progress */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#fbbe00]" />
              Overall Academic Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats.completed_portions} of {stats.total_portions} topics covered
                </span>
                <span className="text-3xl font-bold text-gradient">{stats.completion_percentage}%</span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0b6d41] to-[#095232] transition-all duration-1000"
                  style={{ width: `${stats.completion_percentage}%` }}
                />
              </div>

              {/* Motivational message based on progress */}
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-[#0b6d41]/10 to-[#fbbe00]/10 dark:from-[#0b6d41]/20 dark:to-[#fbbe00]/20 border border-[#0b6d41]/20 dark:border-[#0b6d41]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-[#0b6d41]">
                    {stats.completion_percentage >= 80 ? (
                      <Trophy className="h-5 w-5 text-white" />
                    ) : stats.completion_percentage >= 50 ? (
                      <TrendingUp className="h-5 w-5 text-white" />
                    ) : (
                      <Zap className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">
                      {stats.completion_percentage >= 80
                        ? "Outstanding progress! You're almost there!"
                        : stats.completion_percentage >= 50
                        ? "Great work! Keep up the momentum!"
                        : "Good start! Let's keep learning!"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.total_portions - stats.completed_portions} topics remaining
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Donut */}
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold mb-4 text-center">Completion Status</h3>
            <DonutChart
              value={stats.completed_portions}
              maxValue={stats.total_portions || 1}
              size={160}
              strokeWidth={18}
              label="Complete"
              sublabel={`${stats.completed_portions}/${stats.total_portions}`}
              color="stroke-green-500"
            />
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-500">{stats.completed_portions}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.total_portions - stats.completed_portions}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Progress Cards */}
        {subjectProgress.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#0b6d41]" />
              Subject-wise Progress
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectProgress.map((item, index) => (
                <div
                  key={item.subject.id}
                  className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl card-hover animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate flex-1">
                      {item.subject.name}
                    </h4>
                    <Badge
                      className={
                        item.completion_percentage >= 80
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white'
                          : item.completion_percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 border-0 text-white'
                          : 'bg-gradient-to-r from-orange-500 to-red-500 border-0 text-white'
                      }
                    >
                      {item.completion_percentage}%
                    </Badge>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.completion_percentage >= 80
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : item.completion_percentage >= 50
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          : 'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${item.completion_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.completed_portions}/{item.total_portions} topics</span>
                    <span className="flex items-center gap-1">
                      {item.subject.facilitator?.first_name} {item.subject.facilitator?.last_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#fbbe00]" />
              Upcoming This Week
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div
                  key={index}
                  className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl flex items-center gap-4 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`p-3 rounded-xl ${
                    deadline.daysUntil === 0
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : deadline.daysUntil <= 2
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                      : 'bg-[#0b6d41]'
                  }`}>
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">{deadline.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{deadline.subject}</p>
                  </div>
                  <Badge
                    className={
                      deadline.daysUntil === 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : deadline.daysUntil <= 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }
                  >
                    {deadline.daysUntil === 0 ? 'Today' : `${deadline.daysUntil}d`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="assessments" className="glass-card rounded-2xl p-6">
          <TabsList className="bg-white/50 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 rounded-xl p-1 mb-6 flex-wrap">
            <TabsTrigger value="assessments" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Assessments
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <FolderKanban className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#0b6d41] data-[state=active]:text-white rounded-lg transition-all">
              <Bell className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          {/* Assessments Tab */}
          <TabsContent value="assessments">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/30 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gradient">Assessment Results</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subject</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Assessment</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Marks</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Percentage</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade, index) => (
                      <TableRow key={index} className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <TableCell className="font-medium text-gray-800 dark:text-gray-100">{grade.subject_name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{grade.assessment_type}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{grade.marks_obtained}/{grade.max_marks}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              grade.percentage >= 80
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-0'
                                : grade.percentage >= 60
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 border-0'
                                : 'bg-gradient-to-r from-red-500 to-rose-500 border-0'
                            }
                          >
                            {grade.percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{format(new Date(grade.graded_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gradient">My Projects</h3>
              {projects.length === 0 ? (
                <div className="text-center py-12 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                  <FolderKanban className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-muted-foreground">No projects assigned</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project, index) => (
                    <div
                      key={project.id}
                      className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl card-hover animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge
                          className={
                            project.status === 'completed'
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-0 text-white'
                              : project.status === 'in_progress'
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-0 text-white'
                              : 'bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white'
                          }
                        >
                          {project.status === 'completed' ? 'Completed' : project.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                        <Badge variant="outline" className="bg-[#0b6d41]/10 dark:bg-[#0b6d41]/30 text-[#0b6d41] dark:text-[#fbbe00] border-[#0b6d41]/20 dark:border-[#0b6d41]/50">
                          {project.type}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{project.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{project.subject_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{project.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/30 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gradient">Weekly Class Schedule</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Day</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Subject</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Time</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Room</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((item, index) => (
                      <TableRow key={index} className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <TableCell className="font-medium text-gray-800 dark:text-gray-100">{item.day}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{item.subject_name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{item.start_time} - {item.end_time}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-[#0b6d41]/10 dark:bg-[#0b6d41]/30 text-[#0b6d41] dark:text-[#fbbe00] border-[#0b6d41]/20 dark:border-[#0b6d41]/50">
                            {item.room}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gradient">Latest Announcements</h3>
              {announcements.length === 0 ? (
                <div className="text-center py-12 bg-white/60 dark:bg-gray-800/60 rounded-xl">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-muted-foreground">No announcements at the moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/40 dark:border-gray-700 rounded-xl card-hover animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#0b6d41]">
                            <Bell className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100">{announcement.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(announcement.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
