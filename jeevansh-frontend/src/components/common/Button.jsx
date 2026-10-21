export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const variants = {
    primary: 'bg-blood-600 text-white hover:bg-blood-700 shadow-lg shadow-blood-600/20',
    secondary: 'bg-white text-olive-700 border-2 border-olive-200 hover:bg-olive-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-700 hover:bg-olive-50 hover:text-olive-800'
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg w-full'
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}