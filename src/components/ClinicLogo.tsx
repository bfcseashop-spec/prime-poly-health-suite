import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "light" | "dark";
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ClinicLogo = ({ className, variant = "dark", showText = true, size = "md" }: Props) => {
  const sizes = {
    sm: { box: "h-8 w-8", icon: "h-4 w-4", title: "text-sm", sub: "text-[10px]" },
    md: { box: "h-10 w-10", icon: "h-5 w-5", title: "text-base", sub: "text-[11px]" },
    lg: { box: "h-14 w-14", icon: "h-7 w-7", title: "text-xl", sub: "text-xs" },
  }[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex items-center justify-center rounded-xl shadow-soft", sizes.box,
        variant === "light" ? "bg-white text-primary" : "clinic-gradient text-primary-foreground")}>
        <Plus className={cn(sizes.icon, "stroke-[3]")} />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={cn("font-bold tracking-tight", sizes.title,
            variant === "light" ? "text-white" : "text-foreground")}>Prime Poly Clinic</span>
          <span className={cn("font-medium uppercase tracking-wider", sizes.sub,
            variant === "light" ? "text-white/70" : "text-muted-foreground")}>Healthcare Management</span>
        </div>
      )}
    </div>
  );
};
