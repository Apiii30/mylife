import { categoryColor, categoryIcon } from "@/config/categories";
import { ModuleIcon } from "@/components/ui/module-icon";

export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return <ModuleIcon icon={categoryIcon(icon)} color={categoryColor(color)} size={size} className={className} />;
}
