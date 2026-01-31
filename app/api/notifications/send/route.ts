import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import webpush from "web-push";

export async function POST(request: Request) {
  // Configure web-push with VAPID details
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { title, body, url, tag } = await request.json();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title,
          body,
          url: url || '/',
          tag: tag || 'default',
        });

        try {
          await webpush.sendNotification(pushSubscription, payload);
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          if (error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          throw error;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
