import { NextResponse } from "next/server";
import { generateText } from "ai";
import { auth } from "@/lib/auth";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";
import { fetchStockQuotes } from "@/lib/stockQuotes";
import { getPortfolioCategoryValue, getStockSymbols } from "@/lib/portfolioValue";

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { includeJointInPortfolio, showLockedAssets } = await request.json();

  try {
    const data = await fetchPortfolioData(userId);

    const stockSymbols = getStockSymbols(data.portfolioCategories);
    const { quotes: stockQuotes } =
      stockSymbols.length > 0 ? await fetchStockQuotes(stockSymbols) : { quotes: {} };

    const getCategoryValue = (category: (typeof data.portfolioCategories)[number]) =>
      getPortfolioCategoryValue(category, stockQuotes);

    const visibleCategories = data.portfolioCategories.filter(
      (cat) => showLockedAssets || !cat.isLocked
    );

    const totalPortfolio = visibleCategories.reduce(
      (sum, cat) => sum + getCategoryValue(cat),
      0
    );
    const totalJoint = data.jointCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const totalLocked = data.portfolioCategories
      .filter((cat) => cat.isLocked)
      .reduce((sum, cat) => sum + getCategoryValue(cat), 0);
    const totalLent = data.lentCategories.reduce((total, cat) => 
      total + cat.entries.reduce((sum, entry) => sum + entry.amount, 0), 0
    );
    const bankBalance = data.savingsAccount + totalLent;
    
    let finalPortfolioTotal = includeJointInPortfolio
      ? totalPortfolio + totalJoint
      : totalPortfolio;

    const portfolioSummary = {
      savingsAccount: data.savingsAccount,
      bankBalance: bankBalance,
      totalPortfolio: finalPortfolioTotal,
      includeJointInPortfolio: includeJointInPortfolio,
      showLockedAssets: !!showLockedAssets,
      portfolioCategories: visibleCategories.map(cat => ({
        name: cat.name,
        amount: getCategoryValue(cat),
        isLiquid: cat.isLiquid,
        isLocked: cat.isLocked,
        isStock: cat.isStock,
        stockSymbol: cat.stockSymbol,
        stockUnits: cat.stockUnits,
      })),
      lockedAssetsTotal: totalLocked,
      lentMoney: data.lentCategories.map(cat => ({
        category: cat.name,
        entries: cat.entries.map(e => ({ name: e.name, amount: e.amount })),
        total: cat.entries.reduce((sum, e) => sum + e.amount, 0)
      })),
      jointAccounts: data.jointCategories.map(cat => ({
        name: cat.name,
        amount: cat.amount
      })),
      totalJointAccounts: totalJoint
    };

    const { text } = await generateText({
      model: 'gpt-4o-mini',
      prompt: `You are a financial advisor. Analyze this portfolio data and provide insights (all amounts in Indian Rupees):

Portfolio Summary:
${JSON.stringify(portfolioSummary, null, 2)}

Important Context:
- The total portfolio value (₹${finalPortfolioTotal.toLocaleString('en-IN')}) ${includeJointInPortfolio ? 'INCLUDES' : 'DOES NOT INCLUDE'} joint accounts
- Joint accounts total: ₹${totalJoint.toLocaleString('en-IN')}
- ${includeJointInPortfolio ? 'User has chosen to include joint accounts in their overall portfolio calculation' : 'User tracks joint accounts separately from their personal portfolio'}
- Locked assets total: ₹${totalLocked.toLocaleString('en-IN')} (PPF, PF, etc.)
- ${showLockedAssets ? 'User is currently INCLUDING locked assets in their portfolio view and total' : 'User is currently HIDING locked assets from their portfolio view and total'}

Please provide:
1. A brief overview of the financial health
2. Key insights about asset allocation (clearly mention whether joint accounts and locked assets are included)
3. Observations about liquidity
4. Suggestions for improvement (2-3 actionable items)
5. Notable patterns in lent money

Format the response in clean, readable markdown with headers, bullet points, and emphasis where appropriate.`,
    });

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("AI Summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
