export function Skeleton({ className = '', ...props }) {
  return <div className={`animate-pulse bg-[#E2E8F0] rounded-lg ${className}`} {...props} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
