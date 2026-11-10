import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";
import {
  dateKey,
  describeLentEntryCreate,
  describeLentEntryDelete,
  describeLentEntryUpdate,
  recordAudit,
} from "@/lib/auditLog";

function positiveAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

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

    // Subtract lent amount from bank balance (savings account)
    const savings = await prisma.savingsAccount.findUnique({ where: { userId } });
    const currentSavings = Number(savings?.amount ?? 0);
    const newSavings = Math.max(0, currentSavings - amount);
    await prisma.savingsAccount.upsert({
      where: { userId },
      update: { amount: newSavings },
      create: { userId, amount: newSavings },
    });

    await prisma.lentEntry.create({
      data: {
        categoryId: parseInt(categoryId),
        name,
        amount,
        date: new Date(date),
        notes: notes || "",
      },
    });

    await recordAudit({
      userId,
      area: "bookkeeping",
      action: "created",
      entityType: "lent_entry",
      entityName: name,
      summary: describeLentEntryCreate({
        name,
        categoryName: category.name,
        amount: Number(amount),
        date,
        notes: notes || "",
        savingsBefore: currentSavings,
        savingsAfter: newSavings,
      }),
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
    const { id, name, amount, date, notes, addMoney, subtractMoney } = await request.json();
    
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
      include: { category: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Update savings: amount change = newAmount - oldAmount (positive = more lent = subtract from savings)
    const oldAmount = Number(entry.amount);
    const delta = amount - oldAmount;
    const savings = await prisma.savingsAccount.findUnique({ where: { userId } });
    const currentSavings = Number(savings?.amount ?? 0);
    const newSavings = Math.max(0, currentSavings - delta);
    await prisma.savingsAccount.upsert({
      where: { userId },
      update: { amount: newSavings },
      create: { userId, amount: newSavings },
    });

    await prisma.lentEntry.update({
      where: { id: parseInt(id) },
      data: {
        name,
        amount,
        date: new Date(date),
        notes: notes || "",
      },
    });

    const change = describeLentEntryUpdate({
      beforeName: entry.name,
      afterName: name,
      categoryName: entry.category.name,
      beforeAmount: Number(entry.amount),
      afterAmount: Number(amount),
      beforeDate: dateKey(entry.date),
      afterDate: dateKey(date),
      beforeNotes: entry.notes || "",
      afterNotes: notes || "",
      addMoney: positiveAmount(addMoney),
      subtractMoney: positiveAmount(subtractMoney),
      savingsBefore: currentSavings,
      savingsAfter: newSavings,
    });

    if (change) {
      await recordAudit({
        userId,
        area: "bookkeeping",
        action: change.action,
        entityType: "lent_entry",
        entityName: name,
        summary: change.summary,
      });
    }

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
      include: { category: true },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Add lent amount back to savings (money no longer lent out)
    const entryAmount = Number(entry.amount);
    const savings = await prisma.savingsAccount.findUnique({ where: { userId } });
    const currentSavings = Number(savings?.amount ?? 0);
    const newSavings = currentSavings + entryAmount;
    await prisma.savingsAccount.upsert({
      where: { userId },
      update: { amount: newSavings },
      create: { userId, amount: newSavings },
    });

    await prisma.lentEntry.delete({
      where: { id: parseInt(id) },
    });

    await recordAudit({
      userId,
      area: "bookkeeping",
      action: "deleted",
      entityType: "lent_entry",
      entityName: entry.name,
      summary: describeLentEntryDelete({
        name: entry.name,
        categoryName: entry.category.name,
        amount: entryAmount,
        savingsBefore: currentSavings,
        savingsAfter: newSavings,
      }),
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting lent entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 400 });
  }
}
