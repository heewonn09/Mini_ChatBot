function SkeletonLine({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-full bg-[rgba(24,50,53,0.08)] ${className}`} />
  );
}

function SkeletonCard({ className = "" }) {
  return (
    <div className={`app-panel rounded-[1.85rem] p-6 ${className}`}>
      <SkeletonLine className="mb-4 h-3 w-20" />
      <SkeletonLine className="mb-6 h-7 w-2/3" />
      <div className="space-y-3">
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
        <SkeletonLine className="h-4 w-4/6" />
      </div>
    </div>
  );
}

function SkeletonStatCard({ className = "" }) {
  return (
    <div className={`app-panel rounded-[1.6rem] p-5 ${className}`}>
      <SkeletonLine className="mb-3 h-9 w-9 rounded-[0.85rem]" />
      <SkeletonLine className="mb-2 h-3 w-24" />
      <SkeletonLine className="mb-1 h-8 w-20" />
      <SkeletonLine className="h-3 w-32" />
    </div>
  );
}

function SkeletonRow({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 rounded-[1.4rem] border border-[rgba(24,50,53,0.08)] bg-white/64 px-4 py-4 ${className}`}>
      <SkeletonLine className="h-7 w-7 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonLine className="h-4 w-3/4" />
      </div>
      <SkeletonLine className="h-3 w-12 shrink-0" />
    </div>
  );
}

export { SkeletonCard, SkeletonStatCard, SkeletonRow, SkeletonLine };
export default SkeletonCard;
