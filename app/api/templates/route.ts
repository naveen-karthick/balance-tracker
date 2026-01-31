import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { templateOperations } from "@/lib/missions-data";
import prisma from "@/lib/prisma";

// GET /api/templates - Get all templates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const templates = await templateOperations.getAll(user.id);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, tasks } = body;

    // Validation
    if (!name || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "Missing required fields: name, tasks (array with at least 1 task)" }, { status: 400 });
    }

    // Validate each task in template
    for (const task of tasks) {
      if (!task.title || !task.dayOfMonth) {
        return NextResponse.json({ error: "Each task must have title and dayOfMonth" }, { status: 400 });
      }
      if (task.dayOfMonth < 1 || task.dayOfMonth > 31) {
        return NextResponse.json({ error: "dayOfMonth must be between 1 and 31" }, { status: 400 });
      }
    }

    const newTemplate = await templateOperations.create(user.id, { name, tasks });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
