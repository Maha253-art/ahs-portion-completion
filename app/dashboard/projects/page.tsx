'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Loader2,
  Search,
  FolderKanban,
  Calendar,
  Trophy,
  Medal,
  Award,
  Upload,
  Star,
  Crown,
  TrendingUp,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileUp,
  Presentation,
  BookOpen,
  Newspaper,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { User } from '@/types/database';

interface Project {
  id: string;
  subject_id: string;
  type: 'case_study' | 'seminar' | 'reportage';
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  is_completed: boolean;
  completed_date: string | null;
  created_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentProjectSubmission {
  id: string;
  project_id: string;
  student_id: string;
  document_url: string | null;
  document_file_name: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  submitted_at: string;
  score: number | null;
  max_score: number;
  remarks: string | null;
  verified: boolean;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  email: string;
  total_score: number;
  max_possible: number;
  percentage: number;
  projects_completed: number;
}

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mySubmissions, setMySubmissions] = useState<StudentProjectSubmission[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('my-projects');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);

  // Form state for uploading project
  const [uploadFormData, setUploadFormData] = useState({
    status: 'completed' as 'pending' | 'in_progress' | 'completed',
    document_file: null as File | null,
    remarks: '',
  });

  const supabase = createClient();

  const fetchCurrentUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (userData) {
        setCurrentUser(userData);
      }
    }
  }, [supabase]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: submissionsData, error } = await supabase
        .from('student_project_submissions')
        .select(`
          student_id,
          score,
          max_score,
          status,
          verified,
          student:users!student_id(id, first_name, last_name, email)
        `)
        .eq('verified', true)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      if (submissionsData && submissionsData.length > 0) {
        const studentTotals: { [key: string]: LeaderboardEntry } = {};

        submissionsData.forEach((submission: any) => {
          const studentId = submission.student_id;
          if (submission.score === null) return;

          if (!studentTotals[studentId]) {
            studentTotals[studentId] = {
              rank: 0,
              student_id: studentId,
              student_name: `${submission.student?.first_name || ''} ${submission.student?.last_name || ''}`.trim() || 'Unknown',
              email: submission.student?.email || '',
              total_score: 0,
              max_possible: 0,
              percentage: 0,
              projects_completed: 0,
            };
          }
          studentTotals[studentId].total_score += Number(submission.score);
          studentTotals[studentId].max_possible += Number(submission.max_score);
          studentTotals[studentId].projects_completed += 1;
        });

        const leaderboardArray = Object.values(studentTotals)
          .map(entry => ({
            ...entry,
            percentage: entry.max_possible > 0 ? (entry.total_score / entry.max_possible) * 100 : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1,
          }));

        setLeaderboard(leaderboardArray);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [supabase]);

  const fetchMySubmissions = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('student_project_submissions')
        .select('*')
        .eq('student_id', currentUser.id);

      if (error) {
        console.error('Error fetching submissions:', error);
        return;
      }

      setMySubmissions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [supabase, currentUser]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          subject:subjects(id, name, code)
        `)
        .order('due_date', { ascending: true });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setProjects([]);
        setFilteredProjects([]);
      } else {
        setProjects(projectsData || []);
        setFilteredProjects(projectsData || []);
      }

      await fetchLeaderboard();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchLeaderboard]);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchMySubmissions();
    }
  }, [currentUser, fetchData, fetchMySubmissions]);

  useEffect(() => {
    let filtered = [...projects];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.title?.toLowerCase().includes(query) ||
          project.subject?.name?.toLowerCase().includes(query) ||
          project.type?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      const now = new Date();
      if (selectedStatus === 'completed') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return submission?.status === 'completed';
        });
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return !submission || submission.status !== 'completed';
        });
      } else if (selectedStatus === 'overdue') {
        filtered = filtered.filter((p) => {
          const submission = getSubmissionForProject(p.id);
          return new Date(p.due_date) < now && (!submission || submission.status !== 'completed');
        });
      }
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((p) => p.type === selectedType);
    }

    setFilteredProjects(filtered);
  }, [searchQuery, selectedStatus, selectedType, projects, mySubmissions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      setUploadFormData({
        ...uploadFormData,
        document_file: file,
      });
    }
  };

  const handleSubmitProject = async () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    setIsSubmitting(true);
    try {
      let documentUrl = null;
      let documentFileName = null;

      if (uploadFormData.document_file) {
        const fileExt = uploadFormData.document_file.name.split('.').pop();
        const fileName = `${currentUser?.id}/${selectedProject.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(fileName, uploadFormData.document_file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload document');
          setIsSubmitting(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('project-documents')
          .getPublicUrl(fileName);
        documentUrl = urlData.publicUrl;
        documentFileName = uploadFormData.document_file.name;
      }

      const { error } = await supabase
        .from('student_project_submissions')
        .upsert({
          project_id: selectedProject.id,
          student_id: currentUser?.id,
          document_url: documentUrl,
          document_file_name: documentFileName,
          status: uploadFormData.status,
          remarks: uploadFormData.remarks || null,
          submitted_at: new Date().toISOString(),
          verified: false,
          score: null,
          max_score: 100,
        }, {
          onConflict: 'project_id,student_id'
        });

      if (error) {
        console.error('Error submitting:', error);
        toast.error('Failed to submit project');
        return;
      }

      toast.success('Project submitted successfully!');
      setIsUploadModalOpen(false);
      setUploadFormData({ status: 'completed', document_file: null, remarks: '' });
      fetchMySubmissions();
      fetchLeaderboard();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmissionForProject = (projectId: string) => {
    return mySubmissions.find(s => s.project_id === projectId);
  };

  const openUploadModal = (project: Project) => {
    setSelectedProject(project);
    const existingSubmission = getSubmissionForProject(project.id);
    if (existingSubmission) {
      setUploadFormData({
        status: existingSubmission.status,
        document_file: null,
        remarks: existingSubmission.remarks || '',
      });
    }
    setIsUploadModalOpen(true);
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'case_study':
        return <BookOpen className="h-6 w-6 text-white" />;
      case 'seminar':
        return <Presentation className="h-6 w-6 text-white" />;
      case 'reportage':
        return <Newspaper className="h-6 w-6 text-white" />;
      default:
        return <FolderKanban className="h-6 w-6 text-white" />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'case_study':
        return 'Case Study';
      case 'seminar':
        return 'Seminar';
      case 'reportage':
        return 'Reportage';
      default:
        return type;
    }
  };

  const getProjectTypeGradient = (type: string) => {
    switch (type) {
      case 'case_study':
        return 'from-blue-500 to-cyan-500';
      case 'seminar':
        return 'from-purple-500 to-pink-500';
      case 'reportage':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const isOverdue = (dueDate: string, submission?: StudentProjectSubmission) => {
    return new Date(dueDate) < new Date() && (!submission || submission.status !== 'completed');
  };

  const totalProjects = projects.length;
  const myCompletedCount = mySubmissions.filter(s => s.status === 'completed').length;
  const myPendingCount = mySubmissions.filter(s => s.status !== 'completed').length;
  const myVerifiedCount = mySubmissions.filter(s => s.verified).length;

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-gradient">My Projects</h1>
            <p className="text-muted-foreground mt-1">
              Upload your project documents and track your progress
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <FolderKanban className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold text-gradient">{totalProjects}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-gradient">{myCompletedCount}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-gradient">{myPendingCount}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Rank</p>
              <p className="text-2xl font-bold text-gradient">
                {leaderboard.find(e => e.student_id === currentUser?.id)?.rank || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="glass-card p-1 bg-white/70 dark:bg-gray-800/70">
            <TabsTrigger
              value="my-projects"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <FileUp className="mr-2 h-4 w-4" />
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* My Projects Tab */}
          <TabsContent value="my-projects" className="space-y-4">
            {/* Filters */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="reportage">Reportage</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                  <FolderKanban className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-muted-foreground">No projects found</p>
                </div>
              ) : (
                filteredProjects.map((project, index) => {
                  const submission = getSubmissionForProject(project.id);
                  const overdue = isOverdue(project.due_date, submission);
                  return (
                    <div
                      key={project.id}
                      className={`glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up ${
                        overdue ? 'border-2 border-red-300' : ''
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${getProjectTypeGradient(project.type)}`}>
                          {getProjectTypeIcon(project.type)}
                        </div>
                        {submission ? (
                          <Badge className={
                            submission.status === 'completed'
                              ? submission.verified
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                              : submission.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {submission.status === 'completed'
                              ? submission.verified ? 'Verified' : 'Submitted'
                              : submission.status === 'in_progress'
                                ? 'In Progress'
                                : 'Pending'}
                          </Badge>
                        ) : overdue ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            Not Started
                          </Badge>
                        )}
                      </div>

                      <div className="mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${getProjectTypeGradient(project.type)} text-white`}>
                          {getProjectTypeLabel(project.type)}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1 line-clamp-2">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        {project.subject?.name || 'Unknown Subject'}
                      </p>

                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="h-4 w-4" />
                        <span className={overdue ? 'text-red-500 font-medium' : ''}>
                          Due: {format(new Date(project.due_date), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {submission && submission.score !== null && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Score</span>
                            <span className="font-bold text-lg text-gradient">
                              {submission.score}/{submission.max_score}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${(submission.score / submission.max_score) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {submission?.document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedDocument(submission.document_url);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className={`${submission?.document_url ? 'flex-1' : 'w-full'} gradient-bg text-white`}
                          onClick={() => openUploadModal(project)}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          {submission ? 'Update' : 'Submit'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            {leaderboard.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center">
                  <Trophy className="h-12 w-12 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Rankings Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The leaderboard will appear once students start completing and getting their projects verified.
                </p>
              </div>
            ) : (
              <>
                {/* Podium Section - Top 3 */}
                {leaderboard.length >= 1 && (
                  <div className="glass-card rounded-2xl p-6 overflow-hidden">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-200">
                        <Crown className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-700">Top Project Performers</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-center gap-4 md:gap-8 pb-4">
                      {/* 2nd Place */}
                      {leaderboard[1] && (
                        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                          <div className="relative mb-3">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-slate-200 to-gray-300 border-4 border-gray-300 shadow-lg flex items-center justify-center">
                              <span className="text-2xl md:text-3xl font-bold text-gray-600">
                                {leaderboard[1].student_name.charAt(0)}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-slate-400 border-2 border-white shadow-md flex items-center justify-center">
                              <Medal className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <h4 className="font-semibold text-gray-700 text-center text-sm md:text-base max-w-[100px] truncate">
                            {leaderboard[1].student_name}
                          </h4>
                          <p className="text-xl md:text-2xl font-bold text-gray-500">{leaderboard[1].percentage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{leaderboard[1].projects_completed} projects</p>
                          <div className="mt-2 w-20 md:w-28 h-24 md:h-28 bg-gradient-to-t from-gray-300 to-slate-200 rounded-t-lg flex items-center justify-center border-2 border-b-0 border-gray-300">
                            <span className="text-4xl md:text-5xl font-bold text-gray-400">2</span>
                          </div>
                        </div>
                      )}

                      {/* 1st Place */}
                      {leaderboard[0] && (
                        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                          <div className="relative mb-3">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 border-4 border-yellow-400 shadow-xl flex items-center justify-center ring-4 ring-yellow-200 ring-offset-2">
                              <span className="text-3xl md:text-4xl font-bold text-yellow-800">
                                {leaderboard[0].student_name.charAt(0)}
                              </span>
                            </div>
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                              <Crown className="h-8 w-8 text-yellow-500 drop-shadow-lg" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-white shadow-md flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <h4 className="font-bold text-gray-800 text-center text-base md:text-lg max-w-[120px] truncate">
                              {leaderboard[0].student_name}
                            </h4>
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          </div>
                          <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                            {leaderboard[0].percentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">{leaderboard[0].projects_completed} projects</p>
                          <div className="mt-2 w-24 md:w-32 h-32 md:h-36 bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t-lg flex items-center justify-center border-2 border-b-0 border-yellow-400 shadow-lg">
                            <span className="text-5xl md:text-6xl font-bold text-yellow-600">1</span>
                          </div>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {leaderboard[2] && (
                        <div className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                          <div className="relative mb-3">
                            <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 border-4 border-amber-300 shadow-lg flex items-center justify-center" style={{ width: '72px', height: '72px' }}>
                              <span className="text-xl md:text-2xl font-bold text-amber-700">
                                {leaderboard[2].student_name.charAt(0)}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-white shadow-md flex items-center justify-center">
                              <Award className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                          <h4 className="font-semibold text-gray-700 text-center text-sm md:text-base max-w-[90px] truncate">
                            {leaderboard[2].student_name}
                          </h4>
                          <p className="text-lg md:text-xl font-bold text-amber-600">{leaderboard[2].percentage.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">{leaderboard[2].projects_completed} projects</p>
                          <div className="mt-2 w-18 md:w-24 h-16 md:h-20 bg-gradient-to-t from-amber-400 to-orange-300 rounded-t-lg flex items-center justify-center border-2 border-b-0 border-amber-300" style={{ width: '96px' }}>
                            <span className="text-3xl md:text-4xl font-bold text-amber-500">3</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Rankings List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/30 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Complete Rankings</h3>
                        <p className="text-sm text-muted-foreground">{leaderboard.length} students ranked</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.student_id}
                        className={`p-4 md:p-5 flex items-center gap-4 transition-all duration-300 hover:bg-gradient-to-r ${
                          entry.student_id === currentUser?.id
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-l-4 border-purple-500'
                            : entry.rank === 1 ? 'hover:from-yellow-50 hover:to-amber-50' :
                            entry.rank === 2 ? 'hover:from-gray-50 hover:to-slate-50' :
                            entry.rank === 3 ? 'hover:from-amber-50 hover:to-orange-50' :
                            'hover:from-purple-50 hover:to-pink-50'
                        }`}
                      >
                        {/* Rank Badge */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md ${
                          entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                          entry.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-slate-400 text-white' :
                          entry.rank === 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' :
                          'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600'
                        }`}>
                          {entry.rank <= 3 ? (
                            entry.rank === 1 ? <Crown className="h-6 w-6" /> :
                            entry.rank === 2 ? <Medal className="h-6 w-6" /> :
                            <Award className="h-6 w-6" />
                          ) : (
                            `#${entry.rank}`
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                          entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                          entry.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-slate-500' :
                          entry.rank === 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                          'bg-gradient-to-br from-purple-400 to-pink-500'
                        }`}>
                          {entry.student_name.charAt(0)}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate ${entry.rank <= 3 ? 'text-gray-800' : 'text-gray-700'}`}>
                              {entry.student_name}
                              {entry.student_id === currentUser?.id && (
                                <span className="ml-2 text-purple-600">(You)</span>
                              )}
                            </p>
                            {entry.rank === 1 && (
                              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                Champion
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{entry.email}</p>
                        </div>

                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Score</p>
                            <p className="font-semibold text-gray-700">{entry.total_score}/{entry.max_possible}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Projects</p>
                            <p className="font-semibold text-gray-700">{entry.projects_completed}</p>
                          </div>
                        </div>

                        {/* Percentage */}
                        <div className="flex flex-col items-end gap-1">
                          <p className={`text-xl md:text-2xl font-bold ${
                            entry.rank === 1 ? 'text-yellow-600' :
                            entry.rank === 2 ? 'text-gray-500' :
                            entry.rank === 3 ? 'text-amber-600' :
                            'text-purple-600'
                          }`}>
                            {entry.percentage.toFixed(1)}%
                          </p>
                          <div className="w-20 md:w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                entry.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                entry.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-slate-500' :
                                entry.rank === 3 ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                'bg-gradient-to-r from-purple-400 to-pink-500'
                              }`}
                              style={{ width: `${entry.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Project Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Submit Project
            </DialogTitle>
            <DialogDescription>
              {selectedProject && (
                <span className="block mt-1">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r ${getProjectTypeGradient(selectedProject.type)} text-white mr-2`}>
                    {getProjectTypeLabel(selectedProject.type)}
                  </span>
                  {selectedProject.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Project Status *</Label>
              <Select
                value={uploadFormData.status}
                onValueChange={(value: 'pending' | 'in_progress' | 'completed') =>
                  setUploadFormData({ ...uploadFormData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label>Upload Document (Optional)</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/50 ${
                  uploadFormData.document_file ? 'border-green-400 bg-green-50/50' : 'border-gray-300'
                }`}
                onClick={() => document.getElementById('document-upload')?.click()}
              >
                {uploadFormData.document_file ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-green-500" />
                    <p className="text-sm text-green-600 font-medium">
                      {uploadFormData.document_file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="text-muted-foreground">
                      Click to upload your project document
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, DOCX, PPT, PPTX (max 20MB)
                    </p>
                  </div>
                )}
                <input
                  id="document-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Notes/Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Add any notes about your project..."
                value={uploadFormData.remarks}
                onChange={(e) => setUploadFormData({ ...uploadFormData, remarks: e.target.value })}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
              <strong>Note:</strong> Your submission will be reviewed and scored by the facilitator.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFormData({ status: 'completed', document_file: null, remarks: '' });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="gradient-bg text-white"
              onClick={handleSubmitProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Your Submitted Document
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedDocument ? (
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-purple-500" />
                <p className="text-muted-foreground mb-4">Document uploaded successfully</p>
                <Button
                  onClick={() => window.open(selectedDocument, '_blank')}
                  className="gradient-bg text-white"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Open Document
                </Button>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No document available</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
