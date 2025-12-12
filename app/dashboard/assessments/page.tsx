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
  ClipboardCheck,
  Calendar,
  Trophy,
  Medal,
  Award,
  Upload,
  Star,
  Crown,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { User } from '@/types/database';

interface Assessment {
  id: string;
  subject_id: string;
  ia_number: number;
  scheduled_date: string;
  conducted_date: string | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
  subject?: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentSubmission {
  id: string;
  assessment_id: string;
  student_id: string;
  marks_obtained: number | null;
  max_marks: number;
  paper_url: string | null;
  paper_file_name: string | null;
  submitted_at: string;
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
  total_marks: number;
  max_possible: number;
  percentage: number;
  assessments_count: number;
}

export default function AssessmentsPage() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mySubmissions, setMySubmissions] = useState<StudentSubmission[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('my-assessments');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Form state for uploading paper
  const [uploadFormData, setUploadFormData] = useState({
    marks_obtained: '',
    max_marks: '100',
    paper_file: null as File | null,
    paper_preview: null as string | null,
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
      const { data: marksData, error } = await supabase
        .from('student_assessment_marks')
        .select(`
          student_id,
          marks_obtained,
          max_marks,
          verified,
          student:users!student_id(id, first_name, last_name, email)
        `)
        .eq('verified', true);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      if (marksData && marksData.length > 0) {
        const studentTotals: { [key: string]: LeaderboardEntry } = {};

        marksData.forEach((mark: any) => {
          const studentId = mark.student_id;
          if (mark.marks_obtained === null) return;

          if (!studentTotals[studentId]) {
            studentTotals[studentId] = {
              rank: 0,
              student_id: studentId,
              student_name: `${mark.student?.first_name || ''} ${mark.student?.last_name || ''}`.trim() || 'Unknown',
              email: mark.student?.email || '',
              total_marks: 0,
              max_possible: 0,
              percentage: 0,
              assessments_count: 0,
            };
          }
          studentTotals[studentId].total_marks += Number(mark.marks_obtained);
          studentTotals[studentId].max_possible += Number(mark.max_marks);
          studentTotals[studentId].assessments_count += 1;
        });

        const leaderboardArray = Object.values(studentTotals)
          .map(entry => ({
            ...entry,
            percentage: entry.max_possible > 0 ? (entry.total_marks / entry.max_possible) * 100 : 0,
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
        .from('student_assessment_marks')
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

      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('internal_assessments')
        .select(`
          *,
          subject:subjects(id, name, code)
        `)
        .order('scheduled_date', { ascending: false });

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        setAssessments([]);
        setFilteredAssessments([]);
      } else {
        setAssessments(assessmentsData || []);
        setFilteredAssessments(assessmentsData || []);
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
    let filtered = [...assessments];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (assessment) =>
          assessment.subject?.name?.toLowerCase().includes(query) ||
          assessment.subject?.code?.toLowerCase().includes(query) ||
          `IA ${assessment.ia_number}`.toLowerCase().includes(query)
      );
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        filtered = filtered.filter((assessment) => assessment.is_completed);
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter((assessment) => !assessment.is_completed);
      }
    }

    setFilteredAssessments(filtered);
  }, [searchQuery, selectedStatus, assessments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadFormData({
          ...uploadFormData,
          paper_file: file,
          paper_preview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPaper = async () => {
    if (!selectedAssessment || !uploadFormData.paper_file) {
      toast.error('Please upload your assessment paper image');
      return;
    }

    if (!uploadFormData.marks_obtained) {
      toast.error('Please enter the marks shown on your paper');
      return;
    }

    const marks = parseFloat(uploadFormData.marks_obtained);
    const maxMarks = parseFloat(uploadFormData.max_marks);

    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    setIsSubmitting(true);
    try {
      let paperUrl = null;
      let paperFileName = null;

      const fileExt = uploadFormData.paper_file.name.split('.').pop();
      const fileName = `${currentUser?.id}/${selectedAssessment.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assessment-papers')
        .upload(fileName, uploadFormData.paper_file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload paper image');
        setIsSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('assessment-papers')
        .getPublicUrl(fileName);
      paperUrl = urlData.publicUrl;
      paperFileName = uploadFormData.paper_file.name;

      const { error } = await supabase
        .from('student_assessment_marks')
        .upsert({
          assessment_id: selectedAssessment.id,
          student_id: currentUser?.id,
          marks_obtained: marks,
          max_marks: maxMarks,
          paper_url: paperUrl,
          paper_file_name: paperFileName,
          submitted_at: new Date().toISOString(),
          verified: false,
        }, {
          onConflict: 'assessment_id,student_id'
        });

      if (error) {
        console.error('Error submitting:', error);
        toast.error('Failed to submit paper');
        return;
      }

      toast.success('Paper submitted successfully! Awaiting verification.');
      setIsUploadModalOpen(false);
      setUploadFormData({ marks_obtained: '', max_marks: '100', paper_file: null, paper_preview: null });
      fetchMySubmissions();
      fetchLeaderboard();
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmissionForAssessment = (assessmentId: string) => {
    return mySubmissions.find(s => s.assessment_id === assessmentId);
  };

  const openUploadModal = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsUploadModalOpen(true);
  };

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.is_completed).length;
  const mySubmittedCount = mySubmissions.length;
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
            <h1 className="text-3xl font-bold text-gradient">My Assessments</h1>
            <p className="text-muted-foreground mt-1">
              Upload your assessment papers and track your rankings
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assessments</p>
              <p className="text-2xl font-bold text-gradient">{totalAssessments}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Submissions</p>
              <p className="text-2xl font-bold text-gradient">{mySubmittedCount}</p>
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-gradient">{myVerifiedCount}</p>
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
              value="my-assessments"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Assessments
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* My Assessments Tab */}
          <TabsContent value="my-assessments" className="space-y-4">
            {/* Filters */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by subject name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assessment Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssessments.length === 0 ? (
                <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <ClipboardCheck className="h-10 w-10 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assessments Available</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Assessments will appear here once your facilitator creates them. You'll be able to upload your assessment papers and track your marks.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 text-sm">
                    <Clock className="h-4 w-4" />
                    Check back later for new assessments
                  </div>
                </div>
              ) : (
                filteredAssessments.map((assessment, index) => {
                  const submission = getSubmissionForAssessment(assessment.id);
                  return (
                    <div
                      key={assessment.id}
                      className="glass-card rounded-2xl p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        {submission ? (
                          <Badge className={submission.verified
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          }>
                            {submission.verified ? 'Verified' : 'Pending Verification'}
                          </Badge>
                        ) : assessment.is_completed ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            Ready to Upload
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">
                        IA {assessment.ia_number}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3">
                        {assessment.subject?.name || 'Unknown Subject'}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(assessment.scheduled_date), 'MMM dd, yyyy')}</span>
                      </div>

                      {submission && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Score</span>
                            <span className="font-bold text-lg text-gradient">
                              {submission.marks_obtained}/{submission.max_marks}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                              style={{ width: `${((submission.marks_obtained || 0) / submission.max_marks) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {submission ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedImage(submission.paper_url);
                                setIsViewModalOpen(true);
                              }}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Paper
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gradient-bg text-white"
                              onClick={() => openUploadModal(assessment)}
                            >
                              <Upload className="mr-1 h-4 w-4" />
                              Re-upload
                            </Button>
                          </>
                        ) : assessment.is_completed ? (
                          <Button
                            size="sm"
                            className="w-full gradient-bg text-white"
                            onClick={() => openUploadModal(assessment)}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Paper
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Not Yet Conducted
                          </Button>
                        )}
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
                  The leaderboard will appear once students start submitting their verified assessment papers.
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
                        <span className="font-semibold text-yellow-700">Top Performers</span>
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
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Marks</p>
                            <p className="font-semibold text-gray-700">{entry.total_marks}/{entry.max_possible}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tests</p>
                            <p className="font-semibold text-gray-700">{entry.assessments_count}</p>
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

      {/* Upload Paper Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Upload Assessment Paper
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment && (
                <>
                  IA {selectedAssessment.ia_number} - {selectedAssessment.subject?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Upload Paper Image *</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50/50 ${
                  uploadFormData.paper_preview ? 'border-green-400 bg-green-50/50' : 'border-gray-300'
                }`}
                onClick={() => document.getElementById('paper-upload')?.click()}
              >
                {uploadFormData.paper_preview ? (
                  <div className="space-y-2">
                    <img
                      src={uploadFormData.paper_preview}
                      alt="Paper preview"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-green-600 font-medium">
                      {uploadFormData.paper_file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="text-muted-foreground">
                      Click to upload your assessment paper
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG (max 10MB)
                    </p>
                  </div>
                )}
                <input
                  id="paper-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Marks Input */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marks">Marks Obtained *</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  max={uploadFormData.max_marks}
                  value={uploadFormData.marks_obtained}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, marks_obtained: e.target.value })}
                  placeholder="Enter marks"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_marks">Maximum Marks</Label>
                <Input
                  id="max_marks"
                  type="number"
                  value={uploadFormData.max_marks}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, max_marks: e.target.value })}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <strong>Note:</strong> Your submission will be verified by the facilitator before being added to the leaderboard.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadFormData({ marks_obtained: '', max_marks: '100', paper_file: null, paper_preview: null });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="gradient-bg text-white"
              onClick={handleSubmitPaper}
              disabled={isSubmitting || !uploadFormData.paper_file}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Paper
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Paper Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gradient">
              Your Submitted Paper
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt="Assessment paper"
                className="w-full rounded-lg shadow-md"
              />
            ) : (
              <p className="text-center text-muted-foreground">No image available</p>
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
