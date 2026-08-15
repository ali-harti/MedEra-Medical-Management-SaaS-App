import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-48" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="lg:col-span-2 h-[450px] rounded-[32px]" />
        <Skeleton className="h-[450px] rounded-[32px]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-[400px] rounded-[32px]" />
        <Skeleton className="h-[400px] rounded-[32px]" />
      </div>
    </div>
  );
};
