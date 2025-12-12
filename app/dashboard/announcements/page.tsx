'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Megaphone,
  Plus,
  Loader2,
  Calendar,
  Trash2,
  Edit,
  Eye,
  Users,
} from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  target_audience: 'all' | 'students' | 'facilitators' | 'admins';
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

const audienceColors = {
  all: 'bg-purple-100 text-purple-700',
  students: 'bg-orange-100 text-orange-700',
  facilitators: 'bg-blue-100 text-blue-700',
  admins: 'bg-green-100 text-green-700',
};

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    target_audience: 'all' as 'all' | 'students' | 'facilitators' | 'admins',
    expires_at: '',
  });
  const supabase = createClient();

  const fetchAnnouncements = useCallback(async () => {
    try {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setCurrentUser(userData);
        }
      }

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
        // Use demo data if table doesn't exist
        setAnnouncements([
          {
            id: '1',
            title: 'Mid-term Exams Schedule Released',
            content: 'The mid-term examination schedule for all departments has been released. Please check the notice board for detailed timings.',
            priority: 'high',
            target_audience: 'all',
            is_active: true,
            created_at: new Date().toISOString(),
            author: { first_name: 'Admin', last_name: 'User' },
          },
          {
            id: '2',
            title: 'Library Hours Extended',
            content: 'During exam period, the library will remain open until 10 PM. Take advantage of the extended hours for your preparation.',
            priority: 'medium',
            target_audience: 'students',
            is_active: true,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            author: { first_name: 'Admin', last_name: 'User' },
          },
          {
            id: '3',
            title: 'Faculty Meeting Tomorrow',
            content: 'Reminder: All facilitators are requested to attend the faculty meeting scheduled for tomorrow at 2 PM in the conference room.',
            priority: 'medium',
            target_audience: 'facilitators',
            is_active: true,
            created_at: new Date(Date.now() - 172800000).toISOString(),
            author: { first_name: 'Admin', last_name: 'User' },
          },
        ]);
      } else if (data) {
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from('announcements').insert({
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        target_audience: formData.target_audience,
        expires_at: formData.expires_at || null,
        author_id: currentUser?.id,
        is_active: true,
      });

      if (error) {
        console.error('Error creating announcement:', error);
        // Demo mode: add locally
        setAnnouncements(prev => [
          {
            id: Date.now().toString(),
            ...formData,
            is_active: true,
            created_at: new Date().toISOString(),
            author: { first_name: 'You', last_name: '' },
          },
          ...prev,
        ]);
      }

      setIsDialogOpen(false);
      setFormData({
        title: '',
        content: '',
        priority: 'medium',
        target_audience: 'all',
        expires_at: '',
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await supabase.from('announcements').delete().eq('id', id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error:', error);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
  };

  const canManage = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

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
            <h1 className="text-3xl font-bold text-gradient">Announcements</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with important notices
            </p>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-bg text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-white/30 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-gradient">Create Announcement</DialogTitle>
                  <DialogDescription>
                    Post a new announcement for users
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Announcement title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your announcement..."
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'low' | 'medium' | 'high') =>
                          setFormData({ ...formData, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select
                        value={formData.target_audience}
                        onValueChange={(value: 'all' | 'students' | 'facilitators' | 'admins') =>
                          setFormData({ ...formData, target_audience: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                          <SelectItem value="facilitators">Facilitators Only</SelectItem>
                          <SelectItem value="admins">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires_at">Expires On (Optional)</Label>
                    <Input
                      id="expires_at"
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="gradient-bg text-white" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Megaphone className="mr-2 h-4 w-4" />
                          Post Announcement
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-200">
                No Announcements
              </h3>
              <p className="text-muted-foreground mt-1">
                There are no announcements at the moment
              </p>
            </div>
          ) : (
            announcements.map((announcement, index) => (
              <div
                key={announcement.id}
                className="glass-card rounded-2xl p-6 animate-fade-in-up card-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      announcement.priority === 'high'
                        ? 'bg-gradient-to-r from-red-500 to-rose-500'
                        : announcement.priority === 'medium'
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}>
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {announcement.title}
                        </h3>
                        <Badge className={priorityColors[announcement.priority]}>
                          {announcement.priority}
                        </Badge>
                        <Badge className={audienceColors[announcement.target_audience]}>
                          <Users className="h-3 w-3 mr-1" />
                          {announcement.target_audience === 'all' ? 'Everyone' : announcement.target_audience}
                        </Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                        </span>
                        {announcement.author && (
                          <span>
                            by {announcement.author.first_name} {announcement.author.last_name}
                          </span>
                        )}
                        {announcement.expires_at && (
                          <span className="text-orange-600">
                            Expires: {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
