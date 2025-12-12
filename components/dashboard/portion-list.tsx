'use client';

import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PortionWithSubject } from '@/types/database';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface PortionListProps {
  portions: PortionWithSubject[];
  subjectName: string;
  subjectCode: string;
  onPortionUpdate?: () => void;
}

export function PortionList({
  portions,
  subjectName,
  subjectCode,
  onPortionUpdate,
}: PortionListProps) {
  const [selectedPortion, setSelectedPortion] = useState<PortionWithSubject | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const completedCount = portions.filter((p) => p.is_completed).length;
  const totalCount = portions.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getPortionStatus = (portion: PortionWithSubject) => {
    if (portion.is_completed) return 'completed';
    const plannedDate = new Date(portion.planned_date);
    if (isPast(plannedDate) && !isToday(plannedDate)) return 'overdue';
    if (isToday(plannedDate)) return 'due-today';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 border-0">Completed</Badge>;
      case 'overdue':
        return <Badge className="bg-gradient-to-r from-red-500 to-rose-500 border-0 animate-pulse">Overdue</Badge>;
      case 'due-today':
        return <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 border-0">Due Today</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 border-0">Pending</Badge>;
    }
  };

  const handlePortionToggle = async (portion: PortionWithSubject) => {
    if (portion.is_completed) {
      // Uncomplete the portion
      setLoading(true);
      try {
        await supabase
          .from('portions')
          .update({
            is_completed: false,
            completed_date: null,
            notes: null,
          })
          .eq('id', portion.id);

        onPortionUpdate?.();
      } catch (error) {
        console.error('Error updating portion:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Open dialog to mark as complete
      setSelectedPortion(portion);
      setNotes('');
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedPortion) return;

    setLoading(true);
    try {
      await supabase
        .from('portions')
        .update({
          is_completed: true,
          completed_date: new Date().toISOString().split('T')[0],
          notes: notes || null,
        })
        .eq('id', selectedPortion.id);

      setSelectedPortion(null);
      setNotes('');
      onPortionUpdate?.();
    } catch (error) {
      console.error('Error marking portion complete:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (plannedDate: string) => {
    const planned = new Date(plannedDate);
    const today = new Date();
    const diffTime = today.getTime() - planned.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden card-hover">
        <div className="p-4 border-b border-white/30 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{subjectName}</h3>
              <p className="text-sm text-muted-foreground">{subjectCode}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gradient">{progressPercentage}%</p>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} completed
              </p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        <div className="p-4 space-y-2">
          {portions.map((portion, index) => {
            const status = getPortionStatus(portion);
            return (
              <div
                key={portion.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all duration-300 hover:shadow-md animate-fade-in-up',
                  status === 'completed' && 'bg-green-50/80 dark:bg-green-900/30 border-green-200/50 dark:border-green-700/50',
                  status === 'overdue' && 'bg-red-50/80 dark:bg-red-900/30 border-red-200/50 dark:border-red-700/50',
                  status === 'due-today' && 'bg-orange-50/80 dark:bg-orange-900/30 border-orange-200/50 dark:border-orange-700/50',
                  status === 'pending' && 'bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={portion.is_completed}
                    onCheckedChange={() => handlePortionToggle(portion)}
                    disabled={loading}
                    className="border-purple-300 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-pink-500 data-[state=checked]:border-0"
                  />
                  <div>
                    <p
                      className={cn(
                        'font-medium text-gray-800 dark:text-gray-100',
                        portion.is_completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {portion.name}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 text-purple-500" />
                      <span>Planned: {format(new Date(portion.planned_date), 'MMM d, yyyy')}</span>
                      {portion.completed_date && (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span>Done: {format(new Date(portion.completed_date), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {status === 'overdue' && (
                    <span className="flex items-center text-sm text-red-600 font-medium">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {getDaysOverdue(portion.planned_date)} days
                    </span>
                  )}
                  {status === 'due-today' && (
                    <span className="flex items-center text-sm text-orange-600 font-medium">
                      <Clock className="h-4 w-4 mr-1" />
                      Today
                    </span>
                  )}
                  {getStatusBadge(status)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedPortion} onOpenChange={() => setSelectedPortion(null)}>
        <DialogContent className="glass-card border-white/30">
          <DialogHeader>
            <DialogTitle className="text-gradient">Mark Portion as Complete</DialogTitle>
            <DialogDescription>
              Mark &quot;{selectedPortion?.name}&quot; as completed. You can optionally add notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Any additional notes about this portion..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white/50 border-white/40 focus:border-purple-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPortion(null)} className="hover:bg-white/50">
              Cancel
            </Button>
            <Button onClick={handleMarkComplete} disabled={loading} className="gradient-bg hover:opacity-90 transition-opacity">
              {loading ? 'Saving...' : 'Mark Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
