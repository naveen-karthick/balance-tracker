import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { taskOperations } from "@/lib/missions-data";
import prisma from "@/lib/prisma";

// GET /api/missions?month=YYYY-MM
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
    }

    const tasks = await taskOperations.getByMonth(user.id, month);

    return NextResponse.json({ tasks, month });
  } catch (error) {
    console.error("Error fetching missions:", error);
    return NextResponse.json({ error: "Failed to fetch missions" }, { status: 500 });
  }
}

// POST /api/missions - Create a new task
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
    const { month, title, dueDate, description, hasReminder, reminderDate } = body;

    // Validation
    if (!month || !title || !dueDate) {
      return NextResponse.json({ error: "Missing required fields: month, title, dueDate" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
    }

    const newTask = await taskOperations.create(user.id, {
      month,
      title,
      dueDate,
      description: description || "",
      completed: false,
      hasReminder: hasReminder === true,
      reminderDate: hasReminder === true ? (reminderDate || dueDate) : undefined,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
