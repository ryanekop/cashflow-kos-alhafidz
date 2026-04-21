import { cn } from "@/lib/shared/cn";

export function Field({ label, children, className }) {
  return (
    <div className={className}>
      {label ? <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">{label}</label> : null}
      {children}
    </div>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={cn("form-control", className)} {...props} />;
}

export function SelectInput({ className, children, ...props }) {
  return (
    <select className={cn("form-control", className)} {...props}>
      {children}
    </select>
  );
}
