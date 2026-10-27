import { CATEGORY_META } from "@/lib/categories";
import type { Category } from "@/lib/types";

export function CategoryIcon({ category, size = "md" }: { category: Category; size?: "sm" | "md" }) {
  const { icon: Icon, color } = CATEGORY_META[category];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg ${size === "sm" ? "h-7 w-7" : "h-9 w-9"}`}
      style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[category].color }} aria-hidden />
      {category}
    </span>
  );
}
