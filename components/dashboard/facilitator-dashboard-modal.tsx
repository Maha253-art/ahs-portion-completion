'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  BookOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  Building2,
} from 'lucide-react';
import { SubjectWithRelations, FacilitatorStats, Portion, User as UserType } from '@/types/database';
import { format, isPast, isToday, addDays } from 'date-fns';

interface FacilitatorDashboardModalProps {
  facilitatorId: string;
  facilitatorName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PortionsBySubject {
  [subjectId: string]: {
    subject: SubjectWithRelations;
    portions: SubjectWithRelations['portions'];
  };
}

export function FacilitatorDashboardModal({
  facilitatorId,
  facilitatorName,
  isOpen,
  onClose,
}: FacilitatorDashboardModalProps) {
  const [loading, setLoading] = useState(true);
  const [facilitator, setFacilitator] = useState<UserType | null>(null);
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
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!facilitatorId) return;

    setLoading(true);
    try {
      // Fetch facilitator info
      const { data: facData } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('id', facilitatorId)
        .single();

      if (facData) {
        setFacilitator(facData);
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

      // Fetch subjects with portions for this facilitator
      const { data: subjects } = await supabase
        .from('subjects')
        .select(`
          *,
          department:departments(*),
          portions(*)
        `)
        .eq('facilitator_id', facilitatorId)
        .eq('academic_year_id', academicYear.id);

      if (subjects) {
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
      console.error('Error fetching facilitator data:', error);
    } finally {
      setLoading(false);
    }
  }, [facilitatorId, supabase]);

  useEffect(() => {
    if (isOpen && facilitatorId) {
      fetchData();
    }
  }, [isOpen, facilitatorId, fetchData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="text-gradient">{facilitatorName}&apos;s Dashboard</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Facilitator Info */}
            {facilitator && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                  {facilitator.first_name?.[0]}{facilitator.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {facilitator.first_name} {facilitator.last_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {facilitator.email}
                    </span>
                    {(facilitator as UserType & { department?: { name: string } }).department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {(facilitator as UserType & { department?: { name: string } }).department?.name}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 border-0 capitalize">
                  {facilitator.role.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{stats.total_portions}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Completed</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{stats.completed_portions}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Pending</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{stats.pending_portions}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs text-red-600 font-medium">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{stats.overdue_portions}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                <span className="text-lg font-bold text-gradient">{stats.completion_percentage}%</span>
              </div>
              <Progress value={stats.completion_percentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upcoming Deadlines */}
              <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-gray-800">Upcoming Deadlines</h4>
                </div>
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming deadlines in the next 7 days
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.subject}</p>
                        </div>
                        <Badge
                          className={
                            item.daysUntil === 0
                              ? 'bg-red-500 border-0'
                              : item.daysUntil === 1
                              ? 'bg-orange-500 border-0'
                              : 'bg-blue-500 border-0'
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

              {/* Subjects Overview */}
              <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold text-gray-800">Subjects</h4>
                </div>
                {Object.keys(portionsBySubject).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subjects assigned
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(portionsBySubject).map(([subjectId, data]) => {
                      const portions = data.portions || [];
                      const completed = portions.filter((p) => p.is_completed).length;
                      const total = portions.length;
                      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                      return (
                        <div
                          key={subjectId}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{data.subject.name}</p>
                              <p className="text-xs text-muted-foreground">{data.subject.code}</p>
                            </div>
                            <span className="text-sm font-semibold text-purple-600">{percentage}%</span>
                          </div>
                          <Progress value={percentage} className="h-1.5" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {completed}/{total} portions
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
