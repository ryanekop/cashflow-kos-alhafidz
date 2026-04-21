import { cn } from "@/lib/shared/cn";

export default function PageHeading({ title, description, centered = false, className }) {
  return (
    <div className={cn(centered && "text-center", className)}>
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
