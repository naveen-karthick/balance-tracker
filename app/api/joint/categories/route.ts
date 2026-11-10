import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchPortfolioData } from "@/lib/fetchPortfolioData";
import {
  describeJointCreate,
  describeJointDelete,
  describeJointUpdate,
  recordAudit,
} from "@/lib/auditLog";

// POST - Add new joint category
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { name, amount } = await request.json();
    
    if (!name || amount === undefined) {
      return NextResponse.json(
        { error: "Name and amount are required" },
        { status: 400 }
      );
    }

    await prisma.jointCategory.create({
      data: { userId, name, amount },
    });

    await recordAudit({
      userId,
      area: "joint",
      action: "created",
      entityType: "joint_category",
      entityName: name,
      summary: describeJointCreate(name, Number(amount)),
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding joint category:", error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 400 });
  }
}

// PUT - Update joint category
export async function PUT(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);

  try {
    const { id, name, amount } = await request.json();
    
    if (!id || !name || amount === undefined) {
      return NextResponse.json(
        { error: "ID, name, and amount are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.jointCategory.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.jointCategory.update({
      where: { id: existing.id },
      data: { name, amount },
    });

    const summary = describeJointUpdate(
      { name: existing.name, amount: Number(existing.amount) },
      { name, amount: Number(amount) }
    );
    if (summary) {
      await recordAudit({
        userId,
        area: "joint",
        action: "updated",
        entityType: "joint_category",
        entityName: name,
        summary,
      });
    }

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating joint category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 400 });
  }
}

// DELETE - Delete joint category
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

    const existing = await prisma.jointCategory.findFirst({
      where: { id: parseInt(id), userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.jointCategory.delete({
      where: { id: existing.id },
    });

    await recordAudit({
      userId,
      area: "joint",
      action: "deleted",
      entityType: "joint_category",
      entityName: existing.name,
      summary: describeJointDelete(existing.name, Number(existing.amount)),
    });

    // Fetch and return updated data
    const data = await fetchPortfolioData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error deleting joint category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 400 });
  }
}
