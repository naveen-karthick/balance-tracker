import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import webpush from "web-push";

function getVapidPrivateKey(): string {
  const raw = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("VAPID_PRIVATE_KEY is not set in environment");
  }
  try {
    const decoded = Buffer.from(raw, "base64url");
    if (decoded.length !== 32) {
      throw new Error(
        `VAPID private key invalid: decoded ${decoded.length} bytes (expected 32). Re-paste the full 43-char key in env.`
      );
    }
    return raw;
  } catch (e: unknown) {
    const err = e as { message?: string };
    if (err.message?.includes("decode to 32 bytes")) throw e;
    throw new Error(
      "VAPID_PRIVATE_KEY is not valid base64url. Regenerate with: npx web-push generate-vapid-keys"
    );
  }
}

function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

/**
 * GET or POST /api/cron/send-reminders
 * Call from a cron job (or manually) with: Authorization: Bearer <CRON_SECRET>
 *
 * Finds tasks for today where:
 * - reminderDate is today (reminder day)
 * - dueDate >= today (task is due today or later)
 * - hasReminder = true, reminderSent = false, completed = false
 * Sends push notifications (payload includes task title) and marks reminderSent + lastReminderSentAt.
 */
export async function GET(request: Request) {
  return runSendReminders(request);
}

export async function POST(request: Request) {
  return runSendReminders(request);
}

async function runSendReminders(request: Request) {
  const secret = getCronSecret();
  if (secret) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const isVercelCron = request.headers.get("user-agent")?.includes("vercel-cron") ?? false;
    if (token !== secret && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const subject = process.env.VAPID_SUBJECT?.trim();
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!subject || !publicKey) {
    return NextResponse.json(
      { error: "VAPID_SUBJECT or NEXT_PUBLIC_VAPID_PUBLIC_KEY not set" },
      { status: 500 }
    );
  }

  const privateKey = getVapidPrivateKey();
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      reminderDate: { gte: startOfToday, lt: endOfToday },
      dueDate: { gte: startOfToday },
      hasReminder: true,
      reminderSent: false,
      completed: false,
    },
    include: {
      user: {
        select: {
          id: true,
          pushSubscriptions: true,
        },
      },
    },
  });

  const results: { taskId: number; title: string; sent: number; failed: number }[] = [];

  for (const task of tasks) {
    const subs = task.user.pushSubscriptions;
    let sent = 0;
    let failed = 0;

    const payload = JSON.stringify({
      title: task.title,
      body: "Due today",
      url: "/missions",
      tag: `task-reminder-${task.id}`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        failed++;
      }
    }

    if (sent > 0 || failed === 0) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          reminderSent: true,
          lastReminderSentAt: new Date(),
        },
      });
    }

    results.push({ taskId: task.id, title: task.title, sent, failed });
  }

  return NextResponse.json({
    ok: true,
    date: startOfToday.toISOString().slice(0, 10),
    tasksProcessed: tasks.length,
    results,
  });
}
