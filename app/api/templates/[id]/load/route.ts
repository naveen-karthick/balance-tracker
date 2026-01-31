import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { templateOperations, taskOperations } from "@/lib/missions-data";
import prisma from "@/lib/prisma";

// POST /api/templates/[id]/load - Load a template into a specific month
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const templateId = parseInt(id);
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const body = await request.json();
    const { month } = body;

    if (!month) {
      return NextResponse.json({ error: "Month parameter is required" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Invalid month format. Use YYYY-MM" }, { status: 400 });
    }

    // Get template
    const template = await templateOperations.getById(user.id, templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Parse month
    const [year, monthNum] = month.split("-").map(Number);

    // Create tasks from template
    const createdTasks = await Promise.all(
      template.tasks.map(async (templateTask) => {
        // Handle months with fewer days (e.g., day 31 in February becomes day 28/29)
        const daysInMonth = new Date(year, monthNum, 0).getDate();
        const actualDay = Math.min(templateTask.dayOfMonth, daysInMonth);
        
        const dueDate = new Date(year, monthNum - 1, actualDay);
        const dueDateStr = dueDate.toISOString().split("T")[0];

        return await taskOperations.create(user.id, {
          month,
          title: templateTask.title,
          dueDate: dueDateStr,
          description: templateTask.description || "",
          completed: false,
          hasReminder: templateTask.setReminderOnDueDate,
          reminderDate: templateTask.setReminderOnDueDate ? dueDateStr : undefined,
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: `Created ${createdTasks.length} tasks from template "${template.name}"`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Error loading template:", error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}
