import type { PortfolioCategory } from "@/types/portfolio";
import type { StockQuote } from "@/lib/stockQuotes";

export function getPortfolioCategoryValue(
  category: PortfolioCategory,
  quotes: Record<string, StockQuote> = {}
): number {
  if (category.isStock && category.stockSymbol && category.stockUnits != null) {
    const quote = quotes[category.stockSymbol.toUpperCase()];
    if (!quote) return 0;
    return Math.round(category.stockUnits * quote.priceInr);
  }

  return Math.round(category.amount);
}

export function getStockSymbols(categories: PortfolioCategory[]): string[] {
  return [
    ...new Set(
      categories
        .filter((category) => category.isStock && category.stockSymbol)
        .map((category) => category.stockSymbol!.toUpperCase())
    ),
  ];
}
