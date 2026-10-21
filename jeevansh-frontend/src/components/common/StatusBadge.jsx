const COLORS = {
  searching: 'bg-amber-100 text-amber-800',
  donor_found: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function StatusBadge({ status }) {
  const label = status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}