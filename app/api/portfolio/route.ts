import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";
import { describeSavingsUpdate, recordAudit } from "@/lib/auditLog";

// GET - Fetch all portfolio data for logged-in user
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// PUT - Update savings account
export async function PUT(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { amount } = await request.json();
    const previous = await prisma.savingsAccount.findUnique({ where: { userId } });
    const before = Number(previous?.amount ?? 0);

    await prisma.savingsAccount.upsert({
      where: { userId },
      update: { amount },
      create: { userId, amount },
    });

    const summary = describeSavingsUpdate(before, Number(amount));
    if (summary) {
      await recordAudit({
        userId,
        area: "bookkeeping",
        action: "updated",
        entityType: "savings_account",
        entityName: "Savings Account",
        summary,
      });
    }

    // Return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating savings:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
