import { cn } from "@/lib/utils";
import "@fontsource/nunito/700.css";

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
        "select-none inline-flex items-baseline leading-none tracking-tight",
        sizeMap[size],
        className
      )}
      style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
    >
      <span className="text-primary">E</span>
      {!iconOnly && <span style={{ color: "#1A1A1A" }}>PRATO</span>}
    </span>
  );
}
