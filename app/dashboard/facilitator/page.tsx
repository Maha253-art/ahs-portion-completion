'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { PortionList } from '@/components/dashboard/portion-list';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, CheckCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { SubjectWithRelations, FacilitatorStats, Portion } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format, isPast, isToday, addDays } from 'date-fns';

interface PortionsBySubject {
  [subjectId: string]: {
    subject: SubjectWithRelations;
    portions: SubjectWithRelations['portions'];
  };
}

export default function FacilitatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FacilitatorStats>({
    total_portions: 0,
    completed_portions: 0,
    pending_portions: 0,
    overdue_portions: 0,
    completion_percentage: 0,
  });
  const [portionsBySubject, setPortionsBySubject] = useState<PortionsBySubject>({});
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    { name: string; subject: string; date: string; daysUntil: number }[]
  >([]);
  const [userName, setUserName] = useState('');
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Fetch user profile
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
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

      if (!academicYear) return;

      // Fetch subjects with portions for this facilitator
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          portions(*)
        `)
        .eq('facilitator_id', authUser.id)
        .eq('academic_year_id', academicYear.id);

      if (subjects) {
        // Calculate stats
        let totalPortions = 0;
        let completedPortions = 0;
        let overduePortions = 0;
        const groupedPortions: PortionsBySubject = {};
        const upcoming: { name: string; subject: string; date: string; daysUntil: number }[] = [];

        subjects.forEach((subject) => {
          const portions = subject.portions || [];
          groupedPortions[subject.id] = {
            subject,
            portions,
          };

          portions.forEach((portion: Portion) => {
            totalPortions++;
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

              // Check upcoming deadlines (next 7 days)
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
                });
              }
            }
          });
        });

        const pendingPortions = totalPortions - completedPortions;
        const completionPercentage =
          totalPortions > 0 ? Math.round((completedPortions / totalPortions) * 100) : 0;

        setStats({
          total_portions: totalPortions,
          completed_portions: completedPortions,
          pending_portions: pendingPortions,
          overdue_portions: overduePortions,
          completion_percentage: completionPercentage,
        });

        setPortionsBySubject(groupedPortions);

        // Sort upcoming deadlines by date
        upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setUpcomingDeadlines(upcoming.slice(0, 5));
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
        {/* Welcome message */}
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-gradient">Welcome back, {userName}</h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your academic progress
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Portions"
            value={stats.total_portions}
            icon={<BookOpen className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Completed"
            value={stats.completed_portions}
            subtitle={`${stats.completion_percentage}% complete`}
            icon={<CheckCircle className="h-6 w-6" />}
            gradient="brand-green"
          />
          <StatCard
            title="Pending"
            value={stats.pending_portions}
            icon={<Clock className="h-6 w-6" />}
            gradient="brand-yellow"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue_portions}
            icon={<AlertTriangle className="h-6 w-6" />}
            gradient="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming deadlines */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-xl bg-[#0b6d41] mr-3">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gradient">Upcoming Deadlines</h3>
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#0b6d41] flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No upcoming deadlines in the next 7 days
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/10 rounded-xl hover:bg-white/70 dark:hover:bg-white/20 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.subject}</p>
                    </div>
                    <Badge
                      className={
                        item.daysUntil === 0
                          ? 'bg-gradient-to-r from-red-500 to-rose-500 border-0 animate-pulse'
                          : item.daysUntil === 1
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 border-0'
                          : 'bg-[#0b6d41] border-0'
                      }
                    >
                      {item.daysUntil === 0
                        ? 'Today'
                        : item.daysUntil === 1
                        ? 'Tomorrow'
                        : `${item.daysUntil} days`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subjects overview */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gradient">My Subjects</h2>
            {Object.keys(portionsBySubject).length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <p className="text-muted-foreground">
                  No subjects assigned for this academic year
                </p>
              </div>
            ) : (
              Object.entries(portionsBySubject).map(([subjectId, data]) => (
                <PortionList
                  key={subjectId}
                  portions={data.portions || []}
                  subjectName={data.subject.name}
                  subjectCode={data.subject.code}
                  onPortionUpdate={fetchData}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
