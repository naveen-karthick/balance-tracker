const INVENTORY_EMAILS = new Set([
  "karthicknk97@gmail.com",
  "manoj1995baskaran@gmail.com",
  "manoj1995baskaran@gmaill.com",
]);

export function canAccessInventory(email?: string | null): boolean {
  if (!email) return false;
  return INVENTORY_EMAILS.has(email.trim().toLowerCase());
}
