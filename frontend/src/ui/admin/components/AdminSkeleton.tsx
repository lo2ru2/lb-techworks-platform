type AdminSkeletonProps = {
  lines?: number;
  height?: number;
};

export function AdminSkeleton({ lines = 5, height = 14 }: AdminSkeletonProps) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="admin-skeleton"
          style={{ height }}
        />
      ))}
    </div>
  );
}
