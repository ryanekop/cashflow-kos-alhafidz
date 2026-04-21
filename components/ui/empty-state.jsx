export default function EmptyState({ children, className = "" }) {
  return (
    <p className={`py-8 text-center text-sm text-gray-400 dark:text-gray-500 ${className}`}>
      {children}
    </p>
  );
}
