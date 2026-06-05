type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const cls =
    key.includes('paid') || key.includes('active') || key.includes('completed')
      ? 'success'
      : key.includes('pending') || key.includes('process')
        ? 'warning'
        : key.includes('cancel') || key.includes('disabled')
          ? 'danger'
          : 'info';
  return <span className={`admin-status-badge ${cls}`}>{status}</span>;
}
