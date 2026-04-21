export default function LoadingState({ className = "" }) {
  return (
    <div className={`flex h-[60vh] items-center justify-center ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[var(--color-brand)] dark:border-gray-600" />
    </div>
  );
}
