import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
    className = "", 
    variant = 'rect', 
    width, 
    height 
}) => {
    const baseClass = "animate-pulse bg-white/5";
    const variantClass = variant === 'circle' ? "rounded-full" : variant === 'text' ? "rounded h-4 w-full" : "rounded-xl";
    
    return (
        <div 
            className={`${baseClass} ${variantClass} ${className}`}
            style={{ width, height }}
        />
    );
};

export const DashboardSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel p-6">
                    <Skeleton variant="rect" width={40} height={40} className="mb-4" />
                    <Skeleton variant="text" width="60%" className="mb-2" />
                    <Skeleton variant="text" width="40%" height={24} />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 h-[400px]">
                <Skeleton variant="rect" width="100%" height="100%" />
            </div>
            <div className="glass-panel p-6 h-[400px]">
                <Skeleton variant="rect" width="100%" height="100%" />
            </div>
        </div>
    </div>
);

export const CalendarSkeleton = () => (
    <div className="flex-1 glass-panel border border-white/5 flex flex-col overflow-hidden animate-in fade-in duration-500">
        <div className="grid border-b border-white/5 bg-white/5 grid-cols-[80px_repeat(5,1fr)]">
            <div className="p-4 border-r border-white/5 h-14" />
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 border-r border-white/5 flex items-center gap-3">
                    <Skeleton variant="circle" width={32} height={32} />
                    <Skeleton variant="text" width="50%" />
                </div>
            ))}
        </div>
        <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] h-full opacity-20">
                <div className="border-r border-white/5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-20 border-b border-white/5" />
                    ))}
                </div>
                {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="border-r border-white/5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-20 border-b border-white/5" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const AnalyticsSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-6 h-32">
                    <Skeleton variant="rect" width={32} height={32} className="mb-4" />
                    <Skeleton variant="text" width="70%" />
                </div>
            ))}
        </div>
        <div className="glass-panel p-8 h-[400px]">
            <Skeleton variant="rect" width="100%" height="100%" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 h-64">
                <Skeleton variant="rect" width="100%" height="100%" />
            </div>
            <div className="glass-panel p-6 h-64">
                <Skeleton variant="rect" width="100%" height="100%" />
            </div>
        </div>
    </div>
);

export const CRMSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
                <Skeleton variant="rect" width={48} height={48} className="rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton variant="text" width={150} />
                    <Skeleton variant="text" width={100} height={12} />
                </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
                <Skeleton variant="rect" width="100%" height={40} className="md:w-64" />
                <Skeleton variant="rect" width={80} height={40} />
                <Skeleton variant="rect" width={120} height={40} />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-6 h-32">
                    <Skeleton variant="text" width="60%" className="mb-2" />
                    <Skeleton variant="text" width="40%" height={32} />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="glass-panel p-6 h-64">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <Skeleton variant="rect" width={56} height={56} className="rounded-2xl" />
                            <div className="space-y-2">
                                <Skeleton variant="text" width={100} />
                                <Skeleton variant="text" width={120} height={12} />
                            </div>
                        </div>
                    </div>
                    <Skeleton variant="rect" width="100%" height={60} className="mb-6" />
                    <div className="mt-auto pt-4 flex justify-between">
                        <Skeleton variant="text" width="40%" />
                        <Skeleton variant="rect" width={32} height={32} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const StaffSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Skeleton variant="rect" width={200} height={40} />
            <Skeleton variant="rect" width={300} height={50} />
            <Skeleton variant="rect" width={150} height={40} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass-panel p-6 h-28">
                    <Skeleton variant="text" width="50%" className="mb-2" />
                    <Skeleton variant="text" width="70%" height={32} />
                </div>
            ))}
        </div>
        <div className="glass-panel border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5">
                <Skeleton variant="text" width="100%" height={40} />
            </div>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Skeleton variant="rect" width={40} height={40} className="rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton variant="text" width={120} />
                            <Skeleton variant="text" width={80} height={10} />
                        </div>
                    </div>
                    <Skeleton variant="rect" width={100} height={20} />
                    <Skeleton variant="rect" width={150} height={32} />
                </div>
            ))}
        </div>
    </div>
);

export const PageSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
            <div className="space-y-3">
                <Skeleton variant="text" width={250} height={32} />
                <Skeleton variant="text" width={150} height={12} />
            </div>
            <Skeleton variant="rect" width={120} height={40} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-6 h-32">
                    <Skeleton variant="text" width="50%" className="mb-2" />
                    <Skeleton variant="text" width="70%" height={32} />
                </div>
            ))}
        </div>
        <div className="glass-panel p-8 h-96">
            <Skeleton variant="rect" width="100%" height="100%" className="rounded-2xl" />
        </div>
    </div>
);

export const FormSkeleton = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-2">
                    <Skeleton variant="text" width={100} height={12} />
                    <Skeleton variant="rect" width="100%" height={45} className="rounded-xl" />
                </div>
            ))}
        </div>
        <div className="flex justify-end gap-4 mt-8">
            <Skeleton variant="rect" width={100} height={40} className="rounded-xl" />
            <Skeleton variant="rect" width={150} height={40} className="rounded-xl" />
        </div>
    </div>
);

export const CallLogsSkeleton = () => (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <Skeleton variant="rect" width={48} height={48} className="rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton variant="text" width={150} />
                    <Skeleton variant="text" width={100} height={12} />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Skeleton variant="rect" width={200} height={40} />
                <Skeleton variant="rect" width={150} height={40} />
            </div>
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
            <div className="lg:col-span-1 glass-panel flex flex-col overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-5 border-b border-white/5 space-y-2">
                        <div className="flex justify-between">
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="20%" height={10} />
                        </div>
                        <Skeleton variant="text" width="80%" height={10} />
                        <div className="flex gap-2">
                            <Skeleton variant="rect" width={50} height={15} />
                            <Skeleton variant="rect" width={50} height={15} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="lg:col-span-2 glass-panel p-8">
                <div className="flex items-center gap-6 mb-10">
                    <Skeleton variant="rect" width={80} height={80} className="rounded-3xl" />
                    <div className="space-y-3">
                        <Skeleton variant="text" width={200} height={32} />
                        <Skeleton variant="text" width={150} />
                    </div>
                </div>
                <Skeleton variant="rect" width="100%" height={100} className="rounded-3xl mb-6" />
                <Skeleton variant="rect" width="100%" height={200} className="rounded-3xl" />
            </div>
        </div>
    </div>
);
