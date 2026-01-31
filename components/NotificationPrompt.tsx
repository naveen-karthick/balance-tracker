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
      console.log('Requesting notification permission...');
      const subscription = await requestNotificationPermission();
      console.log('Subscription obtained:', subscription);
      
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      console.log('Subscribe response:', response.status);
      const data = await response.json();
      console.log('Subscribe data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setPermission('granted');
      setIsSubscribed(true);
      alert('Notifications enabled! 🎉');
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      alert(`Failed to enable notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Test Notification',
          body: 'Your notifications are working!',
          url: '/missions',
        }),
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium text-green-900">Notifications enabled</span>
          </div>
          <button
            onClick={handleTestNotification}
            className="text-xs text-green-700 hover:text-green-800 underline"
          >
            Test
          </button>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-900">
          Notifications blocked. Enable in browser settings.
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
            Get notified when tasks are due
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
