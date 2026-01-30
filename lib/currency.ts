// Format number in Indian currency format (Lakhs notation)
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
