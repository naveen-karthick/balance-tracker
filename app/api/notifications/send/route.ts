import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import webpush from "web-push";

function getVapidPrivateKey(): string {
  const raw = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("VAPID_PRIVATE_KEY is not set in environment");
  }
  // web-push expects base64url that decodes to exactly 32 bytes
  try {
    const decoded = Buffer.from(raw, "base64url");
    if (decoded.length !== 32) {
      // Valid base64url for 32 bytes = 43 characters. Raw length 42 = missing 1 char (e.g. on deploy env).
      console.error(
        "[VAPID] Private key decoded length is",
        decoded.length,
        "(expected 32). Raw string length:",
        raw.length,
        "(expected 43)"
      );
      throw new Error(
        `VAPID private key invalid: decoded ${decoded.length} bytes (expected 32), raw length ${raw.length} (expected 43). On deploy, re-paste the full key in env—no spaces/newlines, all 43 chars.`
      );
    }
    return raw;
  } catch (e: any) {
    if (e.message?.includes("decode to 32 bytes")) throw e;
    console.error("[VAPID] Private key invalid base64url. Raw length:", raw.length);
    throw new Error(
      "VAPID_PRIVATE_KEY is not valid base64url. Regenerate with: npx web-push generate-vapid-keys"
    );
  }
}

export async function POST(request: Request) {
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
