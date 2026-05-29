import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";

function buildCategoryData(body: {
  name: string;
  amount?: number;
  isLiquid?: boolean;
  isStock?: boolean;
  stockSymbol?: string;
  stockUnits?: number;
}) {
  const { name, amount, isLiquid, isStock, stockSymbol, stockUnits } = body;

  if (isStock) {
    if (!stockSymbol?.trim() || stockUnits === undefined || stockUnits <= 0) {
      return {
        error: "Stock symbol and units are required for stock categories",
        status: 400 as const,
      };
    }

    return {
      data: {
        name,
        amount: 0,
        isLiquid: isLiquid || false,
        isStock: true,
        stockSymbol: stockSymbol.trim().toUpperCase(),
        stockUnits,
      },
    };
  }

  if (amount === undefined) {
    return {
      error: "Amount is required for non-stock categories",
      status: 400 as const,
    };
  }

  return {
    data: {
      name,
      amount,
      isLiquid: isLiquid || false,
      isStock: false,
      stockSymbol: null,
      stockUnits: null,
    },
  };
}

// POST - Add new portfolio category
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const result = buildCategoryData(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.portfolioCategory.create({
      data: {
        userId,
        ...result.data,
      },
    });

    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding category:", error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 400 });
  }
}

// PUT - Update portfolio category
export async function PUT(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id || !body.name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 }
      );
    }

    const result = buildCategoryData(body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await prisma.portfolioCategory.updateMany({
      where: { id: parseInt(id), userId },
      data: result.data,
    });

    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 400 });
  }
}

// DELETE - Delete portfolio category
export async function DELETE(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.portfolioCategory.deleteMany({
      where: { id: parseInt(id), userId },
    });

    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 400 });
  }
}
