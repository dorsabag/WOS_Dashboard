import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon, description, className = "" }: StatCardProps) {
  return (
    <Card className={`bg-card/50 backdrop-blur-sm border-border/50 ${className}`}>
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
          {icon && <div className="opacity-50">{icon}</div>}
        </div>
        <div className="text-2xl font-bold font-mono text-foreground flex items-center">
          {value}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        )}
      </CardContent>
    </Card>
  );
}
