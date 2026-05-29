// Format number in Indian currency format (whole rupees, no decimals)
export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}
