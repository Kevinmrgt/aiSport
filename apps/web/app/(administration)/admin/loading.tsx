export default function Loading() {
  return (
    <div role="status" className="space-y-6">
      <p className="muted-copy">Chargement de l’administration…</p>
      <div className="admin-skeleton h-16" />
      <div className="admin-metric-grid">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} className="admin-skeleton h-28" />
        ))}
      </div>
      <div className="admin-skeleton h-72" />
    </div>
  );
}
