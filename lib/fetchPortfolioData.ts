import prisma from "@/lib/prisma";

export async function fetchPortfolioData(userId: number) {
  const [savingsAccount, portfolioCategories, lentCategories, jointCategories] = await Promise.all([
    prisma.savingsAccount.findUnique({ where: { userId } }),
    prisma.portfolioCategory.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
    prisma.lentCategory.findMany({ 
      where: { userId },
      include: { entries: { where: { isPaid: false } } },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.jointCategory.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
  ]);

  return {
    savingsAccount: Number(savingsAccount?.amount || 0),
    portfolioCategories: portfolioCategories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      amount: Number(cat.amount),
      isLiquid: cat.isLiquid,
      isStock: cat.isStock,
      stockSymbol: cat.stockSymbol,
      stockUnits: cat.stockUnits != null ? Number(cat.stockUnits) : null,
    })),
    lentCategories: lentCategories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      entries: cat.entries.map(entry => ({
        id: entry.id.toString(),
        name: entry.name,
        amount: Number(entry.amount),
        date: entry.date.toISOString().split('T')[0],
        notes: entry.notes || '',
      })),
    })),
    jointCategories: jointCategories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      amount: Number(cat.amount),
    })),
  };
}
