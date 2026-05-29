export interface StockQuote {
  symbol: string;
  priceUsd: number;
  priceInr: number;
}

export interface StockQuotesResult {
  quotes: Record<string, StockQuote>;
  usdToInr: number;
}

export async function fetchUsdToInr(): Promise<number> {
  const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=INR", {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch USD to INR rate");
  }

  const data = (await response.json()) as { rates?: { INR?: number } };
  const rate = data.rates?.INR;

  if (!rate) {
    throw new Error("USD to INR rate unavailable");
  }

  return rate;
}

export async function fetchStockPriceUsd(symbol: string): Promise<number> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedSymbol)}?interval=1d&range=1d`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 300 },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch price for ${normalizedSymbol}`);
  }

  const data = (await response.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
        };
      }>;
    };
  };

  const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;

  if (price == null || Number.isNaN(price)) {
    throw new Error(`Price unavailable for ${normalizedSymbol}`);
  }

  return price;
}

export async function fetchStockQuotes(symbols: string[]): Promise<StockQuotesResult> {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
  const usdToInr = await fetchUsdToInr();

  const quotes: Record<string, StockQuote> = {};

  await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        const priceUsd = await fetchStockPriceUsd(symbol);
        quotes[symbol] = {
          symbol,
          priceUsd,
          priceInr: priceUsd * usdToInr,
        };
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
      }
    })
  );

  return { quotes, usdToInr };
}
