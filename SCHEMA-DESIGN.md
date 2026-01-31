# Prisma Schema Design for Monthly Missions

## Task Model - Optimized for Cron Jobs

### Core Fields

```prisma
model Task {
  id           Int      @id @default(autoincrement())
  userId       String
  month        String   // "YYYY-MM" for fast month filtering
  title        String
  dueDate      DateTime // Full DateTime for precise comparisons
  description  String?  @db.Text
  completed    Boolean  @default(false)
  hasReminder  Boolean  @default(false)
  reminderDate DateTime? // When to send notification
  
  // Future: Notification tracking
  reminderSent Boolean  @default(false)
  lastReminderSentAt DateTime?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## Index Strategy for Scalability

### 1. **User + Month Index** (Most Common Query)
```prisma
@@index([userId, month])
```

**Use Case:**
```sql
-- Fetch all tasks for user in January 2026
SELECT * FROM Task WHERE userId = ? AND month = '2026-01'
```

**Performance:** O(log n) lookup, very fast

---

### 2. **Cron Job Index** (Hourly Reminder Check)
```prisma
@@index([reminderDate, hasReminder, completed, reminderSent])
```

**Use Case:**
```sql
-- Find tasks that need reminders sent TODAY
SELECT * FROM Task 
WHERE DATE(reminderDate) = CURRENT_DATE
  AND hasReminder = true
  AND completed = false
  AND reminderSent = false
```

**Why This Order:**
1. **reminderDate** - Filter to today's date first (most selective)
2. **hasReminder** - Only tasks with reminders enabled
3. **completed** - Exclude completed tasks
4. **reminderSent** - Exclude already-sent reminders

**Performance:** Composite index allows efficient filtering without full table scan

---

### 3. **Due Date Index** (Overdue Queries)
```prisma
@@index([dueDate])
```

**Use Case:**
```sql
-- Find overdue tasks
SELECT * FROM Task 
WHERE dueDate < CURRENT_DATE 
  AND completed = false
```

---


### 4. **User + Completed Index** (Filter UI)
```prisma
@@index([userId, completed])
```

**Use Case:**
```sql
-- Show only incomplete tasks for a user
SELECT * FROM Task WHERE userId = ? AND completed = false
```

---

## Cron Job Query Pattern

### Efficient Hourly Reminder Check

```typescript
// app/api/cron/send-reminders/route.ts
export async function GET() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find tasks needing reminders TODAY
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
          email: true,
          name: true,
        },
      },
    },
  });

  // Send reminders (Vercel Cron will call this endpoint)
  for (const task of tasksNeedingReminders) {
    await sendReminderNotification(task);
    
    // Mark as sent
    await prisma.task.update({
      where: { id: task.id },
      data: {
        reminderSent: true,
        lastReminderSentAt: new Date(),
      },
    });
  }

  return { sent: tasksNeedingReminders.length };
}
```

---

## Template Model

### JSON Structure for Flexibility

```prisma
model Template {
  id        Int      @id @default(autoincrement())
  userId    String
  name      String
  tasks     Json     // Flexible structure
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Template JSON Format

```json
{
  "tasks": [
    {
      "title": "Pay credit card",
      "dayOfMonth": 15,
      "description": "Full payment",
      "setReminderOnDueDate": true
    },
    {
      "title": "Review portfolio",
      "dayOfMonth": 28,
      "description": "",
      "setReminderOnDueDate": false
    }
  ]
}
```

**Why JSON?**
- Flexible schema (easy to add fields)
- Templates don't need complex queries
- Simpler than separate `TemplateTask` junction table
- Easy to serialize/deserialize

---

## Vercel Cron Configuration

### vercel.json

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

**Schedule:** Every hour at :00 (e.g., 9:00, 10:00, 11:00)

**Alternative Schedules:**
- `0 9 * * *` - Daily at 9:00 AM
- `0 9,15 * * *` - Daily at 9:00 AM and 3:00 PM
- `*/30 * * * *` - Every 30 minutes

---

## Scalability Considerations

### Current Design (Good for <1M tasks)
- Indexes ensure fast queries
- DateTime fields allow precise filtering
- Composite index on cron query path

### Future Optimizations (If Needed)

1. **Partitioning by Month**
   - Separate tables per month (e.g., `Task_2026_01`)
   - Reduces index size for large datasets

2. **Separate Reminders Table**
   ```prisma
   model Reminder {
     id         Int      @id @default(autoincrement())
     taskId     Int
     scheduledFor DateTime
     sent       Boolean  @default(false)
     sentAt     DateTime?
     
     task Task @relation(fields: [taskId], references: [id])
     
     @@index([scheduledFor, sent])
   }
   ```
   - Better for tasks with multiple reminders
   - Easier to query/update

3. **Background Job Queue**
   - Use services like Inngest, QStash, or BullMQ
   - Better than Vercel Cron for high volume
   - Retry logic, failure handling

4. **Notification Service**
   - Separate microservice for sending notifications
   - Use SQS/RabbitMQ for queueing
   - Push notifications via Firebase, OneSignal, etc.

---

## Database Performance Tips

### 1. Use DateTime for Date Comparisons
```typescript
// ❌ Slow - String comparison
dueDate: "2026-01-15"

// ✅ Fast - DateTime comparison
dueDate: new Date("2026-01-15")
```

### 2. Limit Fields in Cron Queries
```typescript
// Only fetch what you need
const tasks = await prisma.task.findMany({
  where: {...},
  select: {
    id: true,
    title: true,
    user: {
      select: {
        email: true,
      },
    },
  },
});
```

### 3. Batch Updates
```typescript
// Update multiple tasks at once
await prisma.task.updateMany({
  where: {
    id: { in: taskIds },
  },
  data: {
    reminderSent: true,
  },
});
```

### 4. Monitor Query Performance
```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

---

## Migration Strategy

### Step 1: Add Models (This PR)
```bash
npx prisma migrate dev --name add_missions_models
```

### Step 2: Migrate Data from In-Memory
- Update `lib/missions-data.ts` to use Prisma
- Replace mock data operations with database queries

### Step 3: Deploy
- Push schema to production database
- Vercel will auto-run `prisma generate` on build

### Step 4: Add Cron (Future)
- Create `/api/cron/send-reminders` endpoint
- Configure `vercel.json`
- Test with Vercel Cron

---

## Example Queries

### Get Monthly Tasks
```typescript
const tasks = await prisma.task.findMany({
  where: {
    userId: user.id,
    month: "2026-01",
  },
  orderBy: {
    dueDate: 'asc',
  },
});
```

### Get Overdue Tasks
```typescript
const overdueTasks = await prisma.task.findMany({
  where: {
    userId: user.id,
    dueDate: {
      lt: new Date(),
    },
    completed: false,
  },
});
```

### Get Tasks Due Today
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const dueToday = await prisma.task.findMany({
  where: {
    userId: user.id,
    dueDate: {
      gte: today,
      lt: tomorrow,
    },
    completed: false,
  },
});
```

---

## Notification Strategy (Future)

### Option 1: Email Reminders (Easiest)
- Use Resend, SendGrid, or Mailgun
- Send email when reminder is due
- Good for desktop/web users

### Option 2: Push Notifications (Better UX)
- Use Firebase Cloud Messaging (FCM)
- Store device tokens in `User` model
- Native app feel
- Works when app is closed

### Option 3: SMS (Premium)
- Use Twilio
- Store phone number (already in schema)
- Highest engagement rate
- Costs per message

### Recommended: Push + Email Fallback
1. Try push notification first
2. Fall back to email if push fails
3. User can configure preferences
