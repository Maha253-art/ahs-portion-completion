'use client';

import { useEffect, useState } from 'react';
import { Loader2, BookOpen, GraduationCap, Users, Building2 } from 'lucide-react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'dashboard' | 'minimal';
}

export function LoadingScreen({
  title = 'Loading',
  subtitle = 'Please wait while we prepare your content...',
  variant = 'default'
}: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  const [activeIcon, setActiveIcon] = useState(0);

  const icons = [BookOpen, GraduationCap, Users, Building2];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const iconInterval = setInterval(() => {
      setActiveIcon(prev => (prev + 1) % icons.length);
    }, 800);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(iconInterval);
    };
  }, []);

  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 animate-pulse flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-3xl opacity-20 blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Animated Logo/Icon Container */}
      <div className="relative mb-8">
        {/* Outer glow ring */}
        <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full opacity-20 blur-2xl animate-pulse" />

        {/* Middle ring */}
        <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-30 animate-spin" style={{ animationDuration: '3s' }} />

        {/* Main container */}
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
          {/* Rotating icons */}
          <div className="relative w-12 h-12">
            {icons.map((Icon, index) => (
              <Icon
                key={index}
                className={`absolute inset-0 w-12 h-12 text-white transition-all duration-500 ${
                  activeIcon === index
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-75'
                }`}
              />
            ))}
          </div>

          {/* Corner accent */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDuration: '1s' }} />
        </div>

        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDelay: '1s' }}>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-pink-400 rounded-full" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDelay: '2s' }}>
          <div className="absolute top-1/2 -left-2 transform -translate-y-1/2 w-2 h-2 bg-purple-300 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gradient mb-2">
        {title}{dots}
      </h2>

      {/* Subtitle */}
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {subtitle}
      </p>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full animate-loading-bar" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/30 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Skeleton loader for cards
export function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  );
}

// Skeleton loader for tables
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4 border-b border-white/30">
        <div className="h-6 bg-gray-200 rounded w-48" />
      </div>
      <div className="p-4 space-y-4">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton loader for stats
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${count} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-6 flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-gray-200" />
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      {/* Stats skeleton */}
      <SkeletonStats count={4} />

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SkeletonCard />
        </div>
        <div className="lg:col-span-2">
          <SkeletonTable rows={4} />
        </div>
      </div>
    </div>
  );
}
