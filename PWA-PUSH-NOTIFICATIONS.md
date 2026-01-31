# PWA Push Notifications Guide

## 🎯 Current Status: iOS Support

### **iOS 16.4+ Requirements:**
- ✅ Web Push API supported (since iOS 16.4, March 2023)
- ✅ PWA must be **added to Home Screen**
- ✅ Notifications must be **user-initiated** (requires user action)
- ⚠️ **Limitations:**
  - Only works for Home Screen PWAs (not Safari browser)
  - No background notifications when app is closed
  - Requires user permission prompt
  - Limited compared to native apps

**Your deployment:** https://balance-tracker-alpha.vercel.app/

---

## 🚀 Implementation Steps

### **Step 1: Generate VAPID Keys**

VAPID (Voluntary Application Server Identification) keys identify your server.

```bash
npx web-push generate-vapid-keys
```

**Output:**
```
Public Key: BKxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...
Private Key: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...
```

**Add to `.env`:**
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-key-here"
VAPID_PRIVATE_KEY="your-private-key-here"
VAPID_SUBJECT="mailto:your-email@example.com"
```

---

### **Step 2: Install Dependencies**

```bash
npm install web-push
```

---

### **Step 3: Create Service Worker**

Create `public/sw.js`:

```javascript
// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const data = event.data ? event.data.json() : {
    title: 'LifeOS',
    body: 'You have a new notification',
  };

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: false,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LifeOS', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
```

---

### **Step 4: Register Service Worker**

Update `app/layout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

### **Step 5: Request Notification Permission**

Create `lib/notifications.ts`:

```typescript
// Convert VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission() {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  // Check if service worker is supported
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Subscribe to push notifications
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });

  return subscription;
}

export async function getSubscription() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function unsubscribe() {
  const subscription = await getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
}
```

---

### **Step 6: Store Subscriptions in Database**

Update `prisma/schema.prisma`:

```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  // ... other fields ...
  
  pushSubscriptions PushSubscription[]
}

model PushSubscription {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  endpoint   String   @unique
  p256dh     String   // Public key
  auth       String   // Auth secret
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_push_subscriptions
```

---

### **Step 7: API to Save Subscriptions**

Create `app/api/notifications/subscribe/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
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

    const subscription = await request.json();

    // Extract keys from subscription
    const { endpoint, keys } = subscription;

    // Save or update subscription
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
```

---

### **Step 8: API to Send Notifications**

Create `app/api/notifications/send/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import webpush from "web-push";

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
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

    // Get user's subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "No subscriptions found" }, { status: 404 });
    }

    // Send notification to all user's devices
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
          // Remove invalid subscriptions
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
```

---

### **Step 9: UI Component to Enable Notifications**

Create `components/NotificationPrompt.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { requestNotificationPermission, getSubscription } from "@/lib/notifications";

export default function NotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    const sub = await getSubscription();
    setIsSubscribed(!!sub);
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const subscription = await requestNotificationPermission();
      
      // Save subscription to backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      setPermission('granted');
      setIsSubscribed(true);
      alert('Notifications enabled! 🎉');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-sm font-medium text-green-900">Notifications enabled</span>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-900">
          Notifications blocked. Please enable in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Enable reminder notifications
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Get notified when your tasks are due
          </p>
          <button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Add to Monthly Missions page:

```typescript
// components/MonthlyMissions.tsx
import NotificationPrompt from "./NotificationPrompt";

export default function MonthlyMissions() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <NotificationPrompt />
      {/* ... rest of component ... */}
    </div>
  );
}
```

---

## 📱 Testing on iOS

### **Step 1: Deploy to Vercel**

```bash
git add .
git commit -m "Add push notifications support"
git push
```

Vercel will deploy automatically.

### **Step 2: Add to Home Screen (iOS)**

1. Open https://balance-tracker-alpha.vercel.app/ in **Safari**
2. Tap **Share** button (square with arrow)
3. Scroll and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. Open the app from Home Screen (not Safari!)

### **Step 3: Enable Notifications**

1. In the PWA app, tap **"Enable Notifications"**
2. iOS will show permission prompt
3. Tap **"Allow"**

### **Step 4: Send Test Notification**

**Option A: Browser Console** (in your PWA app):
```javascript
fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test from LifeOS!',
    url: '/missions',
    tag: 'test'
  })
}).then(r => r.json()).then(console.log);
```

**Option B: Create Test Button** (add to MonthlyMissions):
```typescript
const handleTestNotification = async () => {
  await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '🎉 Reminder',
      body: 'Pay credit card bill is due today!',
      url: '/missions',
    }),
  });
};

<button onClick={handleTestNotification} className="btn-secondary px-4 py-2 rounded-lg">
  Send Test Notification
</button>
```

---

## 🔔 Integrate with Cron for Reminders

Update `app/api/cron/send-reminders/route.ts`:

```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import webpush from "web-push";

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: Request) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find tasks needing reminders
  const tasksNeedingReminders = await prisma.task.findMany({
    where: {
      reminderDate: { gte: today, lt: tomorrow },
      hasReminder: true,
      completed: false,
      reminderSent: false,
    },
    include: {
      user: {
        include: {
          pushSubscriptions: true,
        },
      },
    },
  });

  const results = [];

  for (const task of tasksNeedingReminders) {
    // Send push notifications to all user's devices
    for (const sub of task.user.pushSubscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        const payload = JSON.stringify({
          title: '⏰ Task Reminder',
          body: `"${task.title}" is due today!`,
          url: '/missions',
          tag: `task-${task.id}`,
        });

        await webpush.sendNotification(pushSubscription, payload);
        results.push({ taskId: task.id, status: 'sent' });
      } catch (error: any) {
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        results.push({ taskId: task.id, status: 'failed', error });
      }
    }

    // Mark as sent
    await prisma.task.update({
      where: { id: task.id },
      data: {
        reminderSent: true,
        lastReminderSentAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    processed: tasksNeedingReminders.length,
    results,
  });
}
```

---

## ⚠️ iOS Limitations & Workarounds

### **Limitations:**
1. **App must be on Home Screen** - Won't work in Safari browser
2. **No background notifications** - App must be open (foreground or recently used)
3. **User action required** - Can't auto-enable notifications
4. **Notification persistence** - iOS may clear notifications

### **Workarounds:**
1. **Encourage Home Screen install** - Show prominent prompt
2. **Multiple notification times** - Send reminders at different times
3. **Email fallback** - Send email if push fails
4. **In-app badges** - Show unread count when app opens

---

## 🔧 Complete Setup Checklist

- [ ] Generate VAPID keys
- [ ] Add environment variables
- [ ] Install `web-push` package
- [ ] Create service worker (`public/sw.js`)
- [ ] Register service worker in layout
- [ ] Create notification helpers (`lib/notifications.ts`)
- [ ] Add database models for subscriptions
- [ ] Run Prisma migration
- [ ] Create subscribe API endpoint
- [ ] Create send notification API endpoint
- [ ] Add NotificationPrompt component
- [ ] Deploy to Vercel
- [ ] Test on iOS (add to Home Screen)
- [ ] Enable notifications
- [ ] Send test notification
- [ ] Integrate with cron for reminders

---

## 📚 Resources

- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [iOS Web Push Support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [web-push library](https://github.com/web-push-libs/web-push)
- [Next.js PWA Guide](https://ducanh-next-pwa.vercel.app/)

Ready to implement? Start with Step 1! 🚀
