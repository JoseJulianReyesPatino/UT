import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./ui/button";

type ResponsiveActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: "default" | "sm";
  className?: string;
  title?: string;
  ariaLabel?: string;
} & Omit<React.ComponentProps<typeof Button>, "variant" | "size" | "className" | "children">;

const sizeClasses = {
  default: "h-10 w-10 px-0 sm:h-10 sm:w-auto sm:px-4 sm:gap-2",
  sm: "h-8 w-8 px-0 sm:h-8 sm:w-auto sm:px-2 sm:gap-2",
} as const;

export function ResponsiveActionButton({
  icon,
  label,
  variant = "ghost",
  size = "default",
  className,
  title,
  ariaLabel,
  type = "button",
  ...props
}: Readonly<ResponsiveActionButtonProps>) {
  return (
    <Button
      {...props}
      type={type}
      variant={variant}
      className={cn(sizeClasses[size], className)}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
    >
      {icon}
      <span className="hidden sm:inline text-sm">{label}</span>
    </Button>
  );
}