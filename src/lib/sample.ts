import type { NewTransaction } from "./types";

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** A believable two months of activity, in pesos, for trying the dashboard before real data exists. */
export const SAMPLE_TRANSACTIONS: NewTransaction[] = [
  { name: "Monthly salary", amount: 62000, type: "income", category: "salary", date: iso(2), note: null },
  { name: "Design retainer", amount: 18000, type: "income", category: "freelance", date: iso(6), note: "Invoice #118" },
  { name: "Condo rent", amount: 18500, type: "expense", category: "housing", date: iso(3), note: null },
  { name: "SM Supermarket", amount: 3420.75, type: "expense", category: "groceries", date: iso(1), note: null },
  { name: "Meralco bill", amount: 2860.4, type: "expense", category: "utilities", date: iso(4), note: null },
  { name: "Dinner with friends", amount: 1850, type: "expense", category: "food", date: iso(5), note: null },
  { name: "Beep card load", amount: 500, type: "expense", category: "transport", date: iso(7), note: null },
  { name: "Streaming bundle", amount: 549, type: "expense", category: "subscriptions", date: iso(8), note: null },
  { name: "Gym membership", amount: 1500, type: "expense", category: "health", date: iso(9), note: null },
  { name: "Concert tickets", amount: 4500, type: "expense", category: "entertainment", date: iso(11), note: null },
  { name: "New headphones", amount: 6990, type: "expense", category: "shopping", date: iso(13), note: null },
  { name: "Puregold", amount: 2188.5, type: "expense", category: "groceries", date: iso(14), note: null },
  { name: "Dividend payout", amount: 3200, type: "income", category: "investment", date: iso(16), note: null },
  { name: "Coffee & lunch", amount: 620, type: "expense", category: "food", date: iso(18), note: null },
  { name: "Fiber internet", amount: 1699, type: "expense", category: "utilities", date: iso(20), note: null },
  { name: "Weekend in Baguio", amount: 7800, type: "expense", category: "travel", date: iso(24), note: "Bus + Airbnb" },
  { name: "Monthly salary", amount: 62000, type: "income", category: "salary", date: iso(32), note: null },
  { name: "Condo rent", amount: 18500, type: "expense", category: "housing", date: iso(33), note: null },
  { name: "Groceries", amount: 3964.9, type: "expense", category: "groceries", date: iso(35), note: null },
  { name: "Online course", amount: 2490, type: "expense", category: "education", date: iso(38), note: null },
  { name: "Birthday gift", amount: 1500, type: "expense", category: "gift", date: iso(41), note: null },
  { name: "Freelance article", amount: 6500, type: "income", category: "freelance", date: iso(44), note: null },
  { name: "Takeout", amount: 780, type: "expense", category: "food", date: iso(47), note: null },
  { name: "Gas", amount: 2400, type: "expense", category: "transport", date: iso(50), note: null },
  { name: "Pharmacy", amount: 845.25, type: "expense", category: "health", date: iso(54), note: null },
];
