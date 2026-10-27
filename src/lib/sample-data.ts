import { addDays, addMonths, toISODate } from "./format";
import type { Category, ExpenseInput } from "./types";

const TEMPLATES: Record<Category, { descriptions: string[]; min: number; max: number; perMonth: number }> = {
  Food: {
    descriptions: ["Groceries", "Coffee", "Lunch with team", "Pizza night", "Farmers market", "Sushi dinner", "Bakery"],
    min: 4,
    max: 95,
    perMonth: 9,
  },
  Transportation: {
    descriptions: ["Gas", "Metro card top-up", "Rideshare", "Parking", "Car wash", "Train ticket"],
    min: 3,
    max: 70,
    perMonth: 4,
  },
  Entertainment: {
    descriptions: ["Movie tickets", "Concert", "Streaming subscription", "Bowling", "Museum entry", "Video game"],
    min: 8,
    max: 85,
    perMonth: 2,
  },
  Shopping: {
    descriptions: ["Running shoes", "Books", "Kitchen supplies", "Winter jacket", "Headphones", "Gift for friend"],
    min: 15,
    max: 180,
    perMonth: 2,
  },
  Bills: {
    descriptions: ["Electricity bill", "Internet", "Phone plan", "Water bill", "Gym membership"],
    min: 30,
    max: 140,
    perMonth: 3,
  },
  Other: {
    descriptions: ["Haircut", "Pharmacy", "Charity donation", "Dry cleaning", "Pet supplies"],
    min: 10,
    max: 60,
    perMonth: 1,
  },
};

/** Small seeded PRNG (mulberry32) so the demo data is the same on every load. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** About six months of realistic expenses ending today. */
export function generateSampleExpenses(now = new Date()): ExpenseInput[] {
  const rand = random(42);
  const today = toISODate(now);
  const result: ExpenseInput[] = [];

  for (let offset = -5; offset <= 0; offset++) {
    const monthStart = addMonths(now, offset);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    for (const [category, t] of Object.entries(TEMPLATES) as [Category, (typeof TEMPLATES)[Category]][]) {
      const count = t.perMonth + Math.floor(rand() * 3) - 1;
      for (let i = 0; i < count; i++) {
        const date = toISODate(addDays(monthStart, Math.floor(rand() * daysInMonth)));
        if (date > today) continue;
        result.push({
          date,
          category,
          description: t.descriptions[Math.floor(rand() * t.descriptions.length)],
          amount: Math.round((t.min + rand() * (t.max - t.min)) * 100) / 100,
        });
      }
    }
  }
  return result;
}
