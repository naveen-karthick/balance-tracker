import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchStockQuotes } from "@/lib/stockQuotes";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { symbols } = (await request.json()) as { symbols?: string[] };

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ quotes: {}, usdToInr: 0 });
    }

    const result = await fetchStockQuotes(symbols);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching stock quotes:", error);
    return NextResponse.json({ error: "Failed to fetch stock quotes" }, { status: 500 });
  }
}
