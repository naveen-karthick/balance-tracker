import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const AREAS = ["portfolio", "bookkeeping", "joint"] as const;
const PAGE_SIZE = 40;

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");

  if (!AREAS.includes(area as (typeof AREAS)[number])) {
    return NextResponse.json({ error: "Invalid area" }, { status: 400 });
  }

  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? parseInt(cursorParam, 10) : null;
  if (cursorParam && !Number.isFinite(cursor)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  try {
    const rows = await prisma.auditLog.findMany({
      where: { userId, area: area as string },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

    return NextResponse.json({
      entries: page.map((entry) => ({
        id: entry.id,
        area: entry.area,
        action: entry.action,
        entityType: entry.entityType,
        entityName: entry.entityName,
        summary: entry.summary,
        snapshot: entry.snapshot,
        createdAt: entry.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching audit history:", error);
    return NextResponse.json({ error: "Failed to fetch audit history" }, { status: 500 });
  }
}
