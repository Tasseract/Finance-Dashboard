import type { TransactionType } from "./types";

export interface Category {
  id: string;
  label: string;
  icon: string; // Material Symbols name
  type: TransactionType | "both";
}

export const CATEGORIES: Category[] = [
  { id: "salary", label: "Salary", icon: "payments", type: "income" },
  { id: "freelance", label: "Freelance", icon: "laptop_mac", type: "income" },
  { id: "investment", label: "Investments", icon: "trending_up", type: "income" },
  { id: "gift", label: "Gifts", icon: "redeem", type: "both" },
  { id: "housing", label: "Housing", icon: "home", type: "expense" },
  { id: "food", label: "Food & Dining", icon: "restaurant", type: "expense" },
  { id: "groceries", label: "Groceries", icon: "shopping_cart", type: "expense" },
  { id: "transport", label: "Transport", icon: "directions_car", type: "expense" },
  { id: "utilities", label: "Utilities", icon: "bolt", type: "expense" },
  { id: "health", label: "Health", icon: "favorite", type: "expense" },
  { id: "entertainment", label: "Entertainment", icon: "movie", type: "expense" },
  { id: "shopping", label: "Shopping", icon: "shopping_bag", type: "expense" },
  { id: "travel", label: "Travel", icon: "flight", type: "expense" },
  { id: "education", label: "Education", icon: "school", type: "expense" },
  { id: "subscriptions", label: "Subscriptions", icon: "subscriptions", type: "expense" },
  { id: "other", label: "Other", icon: "category", type: "both" },
];

export function categoriesFor(type: TransactionType): Category[] {
  return CATEGORIES.filter((c) => c.type === type || c.type === "both");
}

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
