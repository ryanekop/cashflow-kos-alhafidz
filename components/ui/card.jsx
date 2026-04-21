import { cn } from "@/lib/shared/cn";

export function Card({ className, children, ...props }) {
  return (
    <div className={cn("surface-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-sm font-semibold text-gray-700 dark:text-gray-200", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-xs text-gray-400 dark:text-gray-500", className)} {...props}>
      {children}
    </p>
  );
}
