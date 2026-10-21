export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <input
        className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-blood-500/20 focus:border-blood-500 outline-none transition-all ${
          error ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}