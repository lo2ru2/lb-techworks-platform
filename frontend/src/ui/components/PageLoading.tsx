export function PageLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{ padding: '3rem 1rem', textAlign: 'center', opacity: 0.75 }}
    >
      <p style={{ margin: 0 }}>Po ngarkohet…</p>
    </div>
  );
}
