'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { User, AcademicYear, UserRole } from '@/types/database';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { Loader2, ShieldAlert } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          // No authenticated user, redirect to login
          router.push('/auth/login');
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError || !userData) {
          // User profile doesn't exist, create one with default role
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              first_name: authUser.user_metadata?.first_name || 'User',
              last_name: authUser.user_metadata?.last_name || '',
              role: 'facilitator',
              is_active: true,
            })
            .select()
            .single();

          if (newUser) {
            setUser(newUser);
          }
        } else {
          setUser(userData);
        }

        const { data: yearsData } = await supabase
          .from('academic_years')
          .select('*')
          .order('start_date', { ascending: false });

        if (yearsData) {
          setAcademicYears(yearsData);
          const activeYear = yearsData.find((y) => y.is_active);
          if (activeYear) {
            setCurrentAcademicYear(activeYear.id);
          } else if (yearsData.length > 0) {
            setCurrentAcademicYear(yearsData[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndData();
  }, [supabase, router]);

  const handleAcademicYearChange = (yearId: string) => {
    setCurrentAcademicYear(yearId);
    localStorage.setItem('currentAcademicYear', yearId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <LoadingScreen
          title="AHS Portal"
          subtitle="Initializing your dashboard experience..."
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <LoadingScreen
          title="Loading"
          subtitle="Setting up your account..."
        />
      </div>
    );
  }

  // Check role-based access
  const isAdminRoute = pathname?.startsWith('/dashboard/admin');
  const isFacilitatorOnlyRoute = pathname?.startsWith('/dashboard/facilitator') || pathname?.startsWith('/dashboard/portions') || pathname?.startsWith('/dashboard/lesson-plans');
  const isStudentRoute = pathname?.startsWith('/dashboard/student');
  const isSharedRoute = pathname?.startsWith('/dashboard/assessments') || pathname?.startsWith('/dashboard/projects') || pathname?.startsWith('/dashboard/settings');
  const isSuperAdminRoute = pathname?.startsWith('/dashboard/super-admin');

  // Access rules:
  // - Super Admin: can access everything
  // - Admin: can access admin, facilitator and student dashboards (but not super-admin routes)
  // - Facilitator: can access facilitator routes, student routes, and shared routes (assessments, projects)
  // - Student: can access student routes and shared routes (assessments, projects)

  const hasAccess = () => {
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin') {
      // Admins can access admin routes but not super-admin routes
      if (isSuperAdminRoute) return false;
      return true;
    }
    if (user.role === 'facilitator') {
      // Facilitators can access facilitator routes, student routes, and shared routes, but not admin routes
      if (isAdminRoute || isSuperAdminRoute) return false;
      return true;
    }
    // Students and any other roles (like 'viewer') are treated as students
    // They can access student routes, shared routes (assessments, projects), and settings
    if (isAdminRoute || isFacilitatorOnlyRoute || isSuperAdminRoute) return false;
    return true;
  };

  // Get the appropriate dashboard path for the user's role
  const getDashboardPath = () => {
    if (user.role === 'super_admin') return '/dashboard/super-admin';
    if (user.role === 'admin') return '/dashboard/admin';
    if (user.role === 'facilitator') return '/dashboard/facilitator';
    return '/dashboard/student'; // Default for students and any other role
  };

  if (!hasAccess()) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => router.push(getDashboardPath())}
            className="px-6 py-2 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-opacity"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Background decorations with floating effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-blob-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-blob-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-blob-pulse" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/4 right-1/4 w-60 h-60 bg-green-400/10 rounded-full blur-3xl animate-float-slow" />
      </div>

      <Sidebar userRole={user.role} />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full glass-sidebar">
          <Sidebar userRole={user.role} />
        </div>
      </div>

      <div className="md:pl-64 relative z-20">
        <Header
          user={user}
          academicYears={academicYears}
          currentAcademicYear={currentAcademicYear}
          onAcademicYearChange={handleAcademicYearChange}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userRole={user.role} />
    </div>
  );
}
