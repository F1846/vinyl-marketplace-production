import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, actionOnClick }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Icon className="h-12 w-12 text-muted" />
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
      {actionLabel && actionOnClick && !actionHref && (
        <button onClick={actionOnClick} className="btn-primary mt-2">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
