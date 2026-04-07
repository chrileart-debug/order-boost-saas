import { cn } from "@/lib/utils";

interface EpratoBrandProps {
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

export function EpratoBrand({ size = "md", iconOnly = false, className }: EpratoBrandProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight select-none inline-flex items-baseline leading-none",
        sizeMap[size],
        className
      )}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <span className="text-primary">E</span>
      {!iconOnly && <span style={{ color: "#1a1a1a" }}>prato</span>}
    </span>
  );
}
