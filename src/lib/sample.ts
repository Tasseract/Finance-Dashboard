import type { NewTransaction } from "./types";

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** A believable two months of activity for trying the dashboard before real data exists. */
export const SAMPLE_TRANSACTIONS: NewTransaction[] = [
  { name: "Monthly salary", amount: 5200, type: "income", category: "salary", date: iso(2), note: null },
  { name: "Design retainer", amount: 1400, type: "income", category: "freelance", date: iso(6), note: "Invoice #118" },
  { name: "Rent", amount: 1850, type: "expense", category: "housing", date: iso(3), note: null },
  { name: "Whole Foods", amount: 142.37, type: "expense", category: "groceries", date: iso(1), note: null },
  { name: "Electric bill", amount: 96.2, type: "expense", category: "utilities", date: iso(4), note: null },
  { name: "Dinner with friends", amount: 84.5, type: "expense", category: "food", date: iso(5), note: null },
  { name: "Metro card", amount: 60, type: "expense", category: "transport", date: iso(7), note: null },
  { name: "Streaming bundle", amount: 24.99, type: "expense", category: "subscriptions", date: iso(8), note: null },
  { name: "Gym", amount: 45, type: "expense", category: "health", date: iso(9), note: null },
  { name: "Concert tickets", amount: 130, type: "expense", category: "entertainment", date: iso(11), note: null },
  { name: "New headphones", amount: 219, type: "expense", category: "shopping", date: iso(13), note: null },
  { name: "Trader Joe's", amount: 88.14, type: "expense", category: "groceries", date: iso(14), note: null },
  { name: "Dividend payout", amount: 212.4, type: "income", category: "investment", date: iso(16), note: null },
  { name: "Coffee & lunch", amount: 37.8, type: "expense", category: "food", date: iso(18), note: null },
  { name: "Internet", amount: 70, type: "expense", category: "utilities", date: iso(20), note: null },
  { name: "Weekend trip", amount: 410, type: "expense", category: "travel", date: iso(24), note: "Train + Airbnb" },
  { name: "Monthly salary", amount: 5200, type: "income", category: "salary", date: iso(32), note: null },
  { name: "Rent", amount: 1850, type: "expense", category: "housing", date: iso(33), note: null },
  { name: "Groceries", amount: 164.9, type: "expense", category: "groceries", date: iso(35), note: null },
  { name: "Online course", amount: 89, type: "expense", category: "education", date: iso(38), note: null },
  { name: "Birthday gift", amount: 65, type: "expense", category: "gift", date: iso(41), note: null },
  { name: "Freelance article", amount: 350, type: "income", category: "freelance", date: iso(44), note: null },
  { name: "Takeout", amount: 52.3, type: "expense", category: "food", date: iso(47), note: null },
  { name: "Gas", amount: 58.6, type: "expense", category: "transport", date: iso(50), note: null },
  { name: "Pharmacy", amount: 31.25, type: "expense", category: "health", date: iso(54), note: null },
];
