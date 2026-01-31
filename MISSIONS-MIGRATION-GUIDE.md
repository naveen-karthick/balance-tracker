# Monthly Missions Database Migration Guide

## 📊 Schema Overview

### Task Model - Optimized for Cron Jobs

```prisma
model Task {
  id           Int      @id @default(autoincrement())
  userId       Int      // Foreign key to User
  month        String   // "YYYY-MM" for fast filtering
  title        String
  dueDate      DateTime // Full DateTime for comparisons
  description  String?  @db.Text
  completed    Boolean  @default(false)
  hasReminder  Boolean  @default(false)
  reminderDate DateTime? // When to send notification
  
  // Future: Track notification status
  reminderSent Boolean  @default(false)
  lastReminderSentAt DateTime?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Template Model

```prisma
model Template {
  id        Int      @id @default(autoincrement())
  userId    Int
  name      String
  tasks     Json     // Flexible JSON structure
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🎯 Why This Design?

### 1. **DateTime for dueDate and reminderDate**
- Allows precise date/time comparisons
- Efficient range queries (e.g., "tasks due today")
- Better than storing strings

### 2. **String for month field**
- Format: `"YYYY-MM"` (e.g., `"2026-01"`)
- Fast filtering for UI (show all tasks for January)
- Indexed with userId for O(log n) lookups

### 3. **Composite Index for Cron Job**
```prisma
@@index([reminderDate, hasReminder, completed, reminderSent])
```

**Optimized Query:**
```sql
SELECT * FROM tasks 
WHERE DATE(reminder_date) = '2026-01-30'
  AND has_reminder = true
  AND completed = false
  AND reminder_sent = false
```

This index allows the database to:
1. Filter by `reminderDate` first (most selective)
2. Then by `hasReminder` (boolean)
3. Then by `completed` (boolean)
4. Finally by `reminderSent` (boolean)

**Result:** Fast queries even with millions of tasks ⚡

### 4. **reminderSent Flag**
- Prevents sending duplicate reminders
- Cron job can safely run multiple times
- Track when reminder was last sent

---

## 🚀 Migration Steps

### Step 1: Run Migration

```bash
npx prisma migrate dev --name add_missions_models
```

This will:
- Create `tasks` table
- Create `templates` table
- Add indexes
- Generate Prisma Client

### Step 2: Verify Migration

```bash
# Check database
npx prisma studio

# Verify schema
npx prisma validate
```

---

## 🔄 Update Code to Use Database

### Update `lib/missions-data.ts`

Replace in-memory operations with Prisma queries:

```typescript
import prisma from "./prisma";

// GET tasks by month
export const taskOperations = {
  getByMonth: async (userId: number, month: string) => {
    return await prisma.task.findMany({
      where: { userId, month },
      orderBy: { dueDate: 'asc' },
    });
  },

  create: async (userId: number, data: {
    month: string;
    title: string;
    dueDate: string; // "YYYY-MM-DD"
    description?: string;
    completed: boolean;
    hasReminder: boolean;
    reminderDate?: string;
  }) => {
    return await prisma.task.create({
      data: {
        userId,
        month: data.month,
        title: data.title,
        dueDate: new Date(data.dueDate), // Convert to DateTime
        description: data.description || "",
        completed: data.completed,
        hasReminder: data.hasReminder,
        reminderDate: data.reminderDate ? new Date(data.reminderDate) : null,
      },
    });
  },

  update: async (userId: number, id: number, updates: any) => {
    // Convert date strings to DateTime if present
    const data: any = { ...updates };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.reminderDate) data.reminderDate = new Date(data.reminderDate);
    
    return await prisma.task.update({
      where: { id, userId }, // Ensure user owns the task
      data,
    });
  },

  delete: async (userId: number, id: number) => {
    await prisma.task.delete({
      where: { id, userId },
    });
    return true;
  },
};

// Template operations
export const templateOperations = {
  getAll: async (userId: number) => {
    return await prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  create: async (userId: number, data: {
    name: string;
    tasks: any[];
  }) => {
    return await prisma.template.create({
      data: {
        userId,
        name: data.name,
        tasks: data.tasks, // JSON will be stored as-is
      },
    });
  },

  getById: async (userId: number, id: number) => {
    return await prisma.template.findFirst({
      where: { id, userId },
    });
  },

  delete: async (userId: number, id: number) => {
    await prisma.template.delete({
      where: { id, userId },
    });
    return true;
  },
};
```

### Update API Routes

**No changes needed!** The API routes already use `taskOperations` and `templateOperations`, so they'll automatically use the database.

Only update: Change `userId` from `string` (email) to `number` (User.id):

```typescript
// app/api/missions/route.ts
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user ID from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const tasks = await taskOperations.getByMonth(user.id, month!);
  return NextResponse.json({ tasks, month });
}
```

---

## 📅 Cron Job for Reminders (Future)

### Create Endpoint: `app/api/cron/send-reminders/route.ts`

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get today's date range
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find tasks needing reminders
  const tasksNeedingReminders = await prisma.task.findMany({
    where: {
      reminderDate: {
        gte: today,
        lt: tomorrow,
      },
      hasReminder: true,
      completed: false,
      reminderSent: false,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  console.log(`Found ${tasksNeedingReminders.length} tasks needing reminders`);

  // Send reminders
  const results = [];
  for (const task of tasksNeedingReminders) {
    try {
      // TODO: Implement notification sending
      // await sendPushNotification(task);
      // await sendEmailReminder(task);

      // Mark as sent
      await prisma.task.update({
        where: { id: task.id },
        data: {
          reminderSent: true,
          lastReminderSentAt: new Date(),
        },
      });

      results.push({ taskId: task.id, status: "sent" });
    } catch (error) {
      console.error(`Failed to send reminder for task ${task.id}:`, error);
      results.push({ taskId: task.id, status: "failed", error });
    }
  }

  return NextResponse.json({
    success: true,
    processed: tasksNeedingReminders.length,
    results,
  });
}
```

### Configure Vercel Cron: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Every hour at :00 minutes

### Add Environment Variable

```bash
# .env
CRON_SECRET="your-secret-here"
```

Set in Vercel Dashboard: Project Settings → Environment Variables

---

## 🧪 Testing Cron Locally

### Manual Test

```bash
# In terminal
curl -H "Authorization: Bearer your-secret-here" http://localhost:3000/api/cron/send-reminders
```

### Create Test Tasks

```typescript
// Browser console or test script
fetch('/api/missions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    month: '2026-01',
    title: 'Test reminder',
    dueDate: '2026-01-31',
    hasReminder: true,
    reminderDate: new Date().toISOString().split('T')[0], // Today
  })
}).then(r => r.json()).then(console.log);

// Then trigger cron
fetch('/api/cron/send-reminders', {
  headers: { 'Authorization': 'Bearer your-secret-here' }
}).then(r => r.json()).then(console.log);
```

---

## 📈 Performance Benchmarks

### Expected Query Times (with indexes)

| Query | Records | Time |
|-------|---------|------|
| Get user's tasks for month | 100 tasks | <5ms |
| Get tasks needing reminders | 10k tasks | <10ms |
| Create task | - | <5ms |
| Update task | - | <3ms |

### Without Indexes (Don't do this!)

| Query | Records | Time |
|-------|---------|------|
| Get tasks needing reminders | 10k tasks | 500ms+ ❌ |

**Indexes matter!**

---

## 🔐 Security Considerations

### 1. User Data Isolation

All queries include `userId` check:
```typescript
where: { id: taskId, userId: user.id }
```

**Prevents:**
- User A modifying User B's tasks
- Unauthorized data access

### 2. Cron Endpoint Protection

```typescript
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Prevents:**
- Unauthorized cron triggers
- DDoS attacks on reminder endpoint

### 3. Input Validation

```typescript
// Validate month format
if (!/^\d{4}-\d{2}$/.test(month)) {
  return NextResponse.json({ error: "Invalid month" }, { status: 400 });
}

// Validate dates
const dueDate = new Date(data.dueDate);
if (isNaN(dueDate.getTime())) {
  return NextResponse.json({ error: "Invalid date" }, { status: 400 });
}
```

---

## 🎯 Next Steps

1. ✅ **Run migration** - `npx prisma migrate dev --name add_missions_models`
2. ✅ **Update lib/missions-data.ts** - Replace in-memory with Prisma
3. ✅ **Update API routes** - Use user.id instead of email
4. ✅ **Test all operations** - Create, read, update, delete
5. 🔜 **Deploy to Vercel** - Database migrations auto-run
6. 🔜 **Add cron endpoint** - For sending reminders
7. 🔜 **Configure vercel.json** - Set up cron schedule
8. 🔜 **Implement notifications** - Push/Email/SMS

---

## 🐛 Troubleshooting

### Migration fails

```bash
# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Or manually drop tables
npx prisma studio
# Delete tasks and templates tables manually
```

### Prisma Client not updated

```bash
npx prisma generate
```

### Type errors after migration

```bash
# Regenerate types
npx prisma generate

# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Queries are slow

```bash
# Check if indexes are created
npx prisma studio
# View table structure

# Enable query logging
const prisma = new PrismaClient({
  log: ['query'],
});
```

---

## 📚 Resources

- [Prisma Indexes](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
