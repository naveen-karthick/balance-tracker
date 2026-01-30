import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";

// POST - Add new lent entry to a category
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { categoryId, name, amount, date, notes } = await request.json();
    
    if (!categoryId || !name || amount === undefined || !date) {
      return NextResponse.json(
        { error: "CategoryId, name, amount, and date are required" },
        { status: 400 }
      );
    }

    // Verify category belongs to user
    const category = await prisma.lentCategory.findFirst({
      where: { id: parseInt(categoryId), userId },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.lentEntry.create({
      data: {
        categoryId: parseInt(categoryId),
        name,
        amount,
        date: new Date(date),
        notes: notes || "",
      },
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding lent entry:", error);
    return NextResponse.json({ error: "Failed to add entry" }, { status: 400 });
  }
}

// PUT - Update lent entry
export async function PUT(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { id, name, amount, date, notes } = await request.json();
    
    if (!id || !name || amount === undefined || !date) {
      return NextResponse.json(
        { error: "ID, name, amount, and date are required" },
        { status: 400 }
      );
    }

    // Verify entry belongs to user's category
    const entry = await prisma.lentEntry.findFirst({
      where: { 
        id: parseInt(id),
        category: { userId }
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.lentEntry.update({
      where: { id: parseInt(id) },
      data: {
        name,
        amount,
        date: new Date(date),
        notes: notes || "",
      },
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating lent entry:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 400 });
  }
}

// DELETE - Delete lent entry
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

    // Verify entry belongs to user's category
    const entry = await prisma.lentEntry.findFirst({
      where: { 
        id: parseInt(id),
        category: { userId }
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.lentEntry.delete({
      where: { id: parseInt(id) },
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting lent entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 400 });
  }
}
