import {
  Car,
  Clapperboard,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "./types";

interface CategoryMeta {
  icon: LucideIcon;
  /** CSS variable from globals.css; order matches the validated palette slots. */
  color: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: { icon: UtensilsCrossed, color: "var(--cat-food)" },
  Transportation: { icon: Car, color: "var(--cat-transportation)" },
  Entertainment: { icon: Clapperboard, color: "var(--cat-entertainment)" },
  Shopping: { icon: ShoppingBag, color: "var(--cat-shopping)" },
  Bills: { icon: Receipt, color: "var(--cat-bills)" },
  Other: { icon: MoreHorizontal, color: "var(--cat-other)" },
};
