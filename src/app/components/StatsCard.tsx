import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  color?: string;
  bgColor?: string;
  cardClass?: string;
  accentClass?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "text-foreground",
  bgColor = "bg-muted",
  cardClass = "bg-gradient-to-br from-white via-white to-slate-50/80 border-border/70 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/40 dark:border-slate-800/70",
  accentClass = "from-slate-400/35 via-slate-300/20 to-transparent",
}: StatsCardProps) {
  return (
    <Card className={`overflow-hidden border shadow-sm hover:shadow-lg transition-all ${cardClass}`}>
      <div className={`h-1 bg-gradient-to-r ${accentClass}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        <div className={`h-10 w-10 rounded-xl ${bgColor} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-foreground/70">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 font-medium ${color}`}>{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
