// Database operations for missions using Prisma
import prisma from "./prisma";

export interface Task {
  id: number;
  userId: number;
  month: string;
  title: string;
  dueDate: string; // Frontend expects string format "YYYY-MM-DD"
  description?: string;
  completed: boolean;
  hasReminder: boolean;
  reminderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: number;
  userId: number;
  name: string;
  tasks: {
    title: string;
    dayOfMonth: number;
    description?: string;
    setReminderOnDueDate: boolean;
  }[];
  createdAt: string;
}

// Helper: Convert Prisma Task to API Task format
function serializeTask(task: any): Task {
  return {
    id: task.id,
    userId: task.userId,
    month: task.month,
    title: task.title,
    dueDate: task.dueDate.toISOString().split("T")[0], // Convert DateTime to "YYYY-MM-DD"
    description: task.description || "",
    completed: task.completed,
    hasReminder: task.hasReminder,
    reminderDate: task.reminderDate ? task.reminderDate.toISOString().split("T")[0] : undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

// Helper: Convert Prisma Template to API Template format
function serializeTemplate(template: any): Template {
  return {
    id: template.id,
    userId: template.userId,
    name: template.name,
    tasks: template.tasks as any, // JSON field
    createdAt: template.createdAt.toISOString(),
  };
}

// Task CRUD operations
export const taskOperations = {
  getByMonth: async (userId: number, month: string) => {
    const tasks = await prisma.task.findMany({
      where: { userId, month },
      orderBy: { dueDate: "asc" },
    });
    return tasks.map(serializeTask);
  },

  getById: async (userId: number, id: number) => {
    const task = await prisma.task.findFirst({
      where: { id, userId },
    });
    return task ? serializeTask(task) : null;
  },

  create: async (userId: number, data: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">) => {
    const task = await prisma.task.create({
      data: {
        userId,
        month: data.month,
        title: data.title,
        dueDate: new Date(data.dueDate), // Convert string to DateTime
        description: data.description || "",
        completed: data.completed,
        hasReminder: data.hasReminder,
        reminderDate: data.reminderDate ? new Date(data.reminderDate) : null,
      },
    });
    return serializeTask(task);
  },

  update: async (userId: number, id: number, updates: Partial<Omit<Task, "id" | "userId" | "createdAt">>) => {
    // Convert date strings to DateTime if present
    const data: any = { ...updates };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.reminderDate !== undefined) {
      data.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    // Verify user owns the task
    if (task.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return serializeTask(task);
  },

  delete: async (userId: number, id: number) => {
    // Verify user owns the task before deleting
    const task = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) return false;

    await prisma.task.delete({
      where: { id },
    });

    return true;
  },
};

// Template CRUD operations
export const templateOperations = {
  getAll: async (userId: number) => {
    const templates = await prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return templates.map(serializeTemplate);
  },

  getById: async (userId: number, id: number) => {
    const template = await prisma.template.findFirst({
      where: { id, userId },
    });
    return template ? serializeTemplate(template) : null;
  },

  create: async (userId: number, data: Omit<Template, "id" | "userId" | "createdAt">) => {
    const template = await prisma.template.create({
      data: {
        userId,
        name: data.name,
        tasks: data.tasks as any, // JSON field
      },
    });
    return serializeTemplate(template);
  },

  delete: async (userId: number, id: number) => {
    // Verify user owns the template before deleting
    const template = await prisma.template.findFirst({
      where: { id, userId },
    });

    if (!template) return false;

    await prisma.template.delete({
      where: { id },
    });

    return true;
  },
};
