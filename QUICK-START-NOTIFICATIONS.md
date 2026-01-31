# 🚀 Quick Start: Push Notifications

## ⚡ TL;DR

Get push notifications working in **10 minutes** for your deployed PWA at https://balance-tracker-alpha.vercel.app/

---

## 📋 Quick Steps

### 1. Generate VAPID Keys (30 seconds)

```bash
npx web-push generate-vapid-keys
```

Copy the output and add to `.env`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BKxXXXX..."
VAPID_PRIVATE_KEY="XXXXXX..."
VAPID_SUBJECT="mailto:your-email@example.com"
```

### 2. Install Package (10 seconds)

```bash
npm install web-push
```

### 3. Add Service Worker (1 minute)

Create `public/sw.js` - [See full code in PWA-PUSH-NOTIFICATIONS.md]

Key parts:
```javascript
// Listen for push events
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192x192.png',
  });
});
```

### 4. Register Service Worker (30 seconds)

In `app/layout.tsx`, add:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

### 5. Add Database Model (1 minute)

In `prisma/schema.prisma`:

```prisma
model PushSubscription {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  endpoint   String   @unique
  p256dh     String
  auth       String
  createdAt  DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("push_subscriptions")
}

// Add to User model:
model User {
  // ... existing fields ...
  pushSubscriptions PushSubscription[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_push_subscriptions
npx prisma generate
```

### 6. Create API Endpoints (2 minutes)

**Subscribe:** `app/api/notifications/subscribe/route.ts`
**Send:** `app/api/notifications/send/route.ts`

[Full code in PWA-PUSH-NOTIFICATIONS.md]

### 7. Add UI Component (2 minutes)

Create `components/NotificationPrompt.tsx` and add to `components/MonthlyMissions.tsx`

### 8. Deploy & Test (2 minutes)

```bash
git add .
git commit -m "Add push notifications"
git push
```

**Test on iOS:**
1. Open https://balance-tracker-alpha.vercel.app/ in Safari
2. Share → Add to Home Screen
3. Open PWA app (from Home Screen, not Safari!)
4. Tap "Enable Notifications" → Allow
5. Test:
   ```javascript
   // In browser console
   fetch('/api/notifications/send', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       title: 'Test!',
       body: 'It works! 🎉'
     })
   });
   ```

---

## ⚠️ iOS Requirements

**Must Have:**
- ✅ iOS 16.4+ (released March 2023)
- ✅ PWA added to Home Screen (not Safari browser)
- ✅ App opened from Home Screen at least once
- ✅ User grants notification permission

**Won't Work:**
- ❌ In Safari browser tab
- ❌ iOS 16.3 or older
- ❌ Background notifications when app is fully closed

---

## 🧪 Quick Test

**After enabling notifications, send a test:**

```javascript
// Option 1: Browser console
fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🎉 Test Notification',
    body: 'Your reminders are working!',
    url: '/missions'
  })
}).then(r => r.json()).then(console.log);
```

**Option 2: Add test button to UI:**

```typescript
<button 
  onClick={() => {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '⏰ Reminder',
        body: 'Pay credit card bill is due today!',
        url: '/missions'
      })
    });
  }}
  className="btn-secondary px-4 py-2 rounded-lg"
>
  Send Test Notification
</button>
```

---

## 🔔 Auto-send Reminders

**Update your cron endpoint to send push notifications:**

```typescript
// app/api/cron/send-reminders/route.ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Find tasks with reminders due today
const tasks = await prisma.task.findMany({
  where: {
    reminderDate: { gte: today, lt: tomorrow },
    hasReminder: true,
    completed: false,
    reminderSent: false,
  },
  include: {
    user: { include: { pushSubscriptions: true } },
  },
});

// Send notifications
for (const task of tasks) {
  for (const sub of task.user.pushSubscriptions) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: '⏰ Task Reminder',
        body: `"${task.title}" is due today!`,
        url: '/missions',
      })
    );
  }
  
  // Mark as sent
  await prisma.task.update({
    where: { id: task.id },
    data: { reminderSent: true },
  });
}
```

---

## 🎯 Production Checklist

Before deploying notifications:

- [ ] VAPID keys generated and added to Vercel env vars
- [ ] Service worker created (`public/sw.js`)
- [ ] Service worker registered in layout
- [ ] Database migration run
- [ ] Subscribe API endpoint created
- [ ] Send API endpoint created
- [ ] UI component added
- [ ] Tested on iOS device (added to Home Screen)
- [ ] Cron job updated to send notifications
- [ ] Email fallback considered (optional)

---

## 🐛 Troubleshooting

### "Service Worker registration failed"
- Check `public/sw.js` exists
- Ensure HTTPS (Vercel provides this)

### "Notification permission denied"
**iOS:** Settings → Safari → [Your Site] → Notifications → Allow

### "Push subscription failed"
- Verify VAPID public key is correct
- Check environment variable is prefixed with `NEXT_PUBLIC_`

### "Notifications not showing"
- Ensure app is opened from Home Screen (not Safari)
- Check iOS version (16.4+ required)
- App must be in foreground or recently active

### "Endpoint gone (410 error)"
- User uninstalled PWA
- Auto-cleanup in code removes invalid subscriptions

---

## 📚 Full Documentation

For detailed implementation, see:
- **PWA-PUSH-NOTIFICATIONS.md** - Complete guide
- **SCHEMA-DESIGN.md** - Cron job design

---

## 💡 Pro Tips

1. **Test locally first:**
   - Use ngrok or Vercel preview to test on your phone
   - `npx vercel dev` for local testing

2. **Multiple devices:**
   - Same user can have multiple subscriptions
   - Notifications sent to all devices

3. **Notification actions:**
   - Add action buttons (Complete, Snooze, etc.)
   - Handled in service worker `notificationclick` event

4. **Rich notifications:**
   - Add images, icons, badges
   - Use vibration patterns
   - Customize notification sounds (limited on iOS)

5. **Fallback strategy:**
   - Send email if push fails
   - Show in-app notifications
   - Badge count on app icon

---

## ⏱️ Time Estimate

- **Basic setup:** 10-15 minutes
- **Testing:** 5 minutes
- **Cron integration:** 10 minutes
- **Polish & edge cases:** 20-30 minutes

**Total:** ~1 hour for production-ready notifications

---

## 🚀 Start Now!

```bash
# 1. Generate keys
npx web-push generate-vapid-keys

# 2. Install
npm install web-push

# 3. Follow steps 3-8 above

# 4. Deploy
git push
```

**You got this!** 🎉
