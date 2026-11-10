import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";
import { describeLentCategoryDelete, recordAudit } from "@/lib/auditLog";

// POST - Add new lent category
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    await prisma.lentCategory.create({
      data: { userId, name },
    });

    await recordAudit({
      userId,
      area: "bookkeeping",
      action: "created",
      entityType: "lent_category",
      entityName: name,
      summary: `Added lent category "${name}".`,
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding lent category:", error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 400 });
  }
}

// DELETE - Delete lent category (and all its entries via cascade)
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
        { error: "Category id is required" },
        { status: 400 }
      );
    }

    const category = await prisma.lentCategory.findFirst({
      where: { id: parseInt(id), userId },
      include: { entries: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.lentCategory.delete({
      where: { id: parseInt(id) },
    });

    await recordAudit({
      userId,
      area: "bookkeeping",
      action: "deleted",
      entityType: "lent_category",
      entityName: category.name,
      summary: describeLentCategoryDelete({
        name: category.name,
        entries: category.entries.map((entry) => ({
          name: entry.name,
          amount: Number(entry.amount),
        })),
      }),
    });

    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting lent category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 400 });
  }
}
