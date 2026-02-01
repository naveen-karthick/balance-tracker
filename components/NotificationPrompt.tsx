"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { Dialog, Transition, Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Fragment } from "react";
import { requestNotificationPermission, getSubscription, unsubscribe } from "@/lib/notifications";

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

type NotificationContextValue = {
  permission: NotificationPermission;
  isSubscribed: boolean;
  loading: boolean;
  testLoading: boolean;
  resetLoading: boolean;
  confirmRemoveOpen: boolean;
  setConfirmRemoveOpen: (v: boolean) => void;
  closePopoverRef: React.MutableRefObject<(() => void) | null>;
  checkSubscription: () => Promise<void>;
  handleEnableNotifications: () => Promise<void>;
  handleTestNotification: () => Promise<void>;
  handleRemoveClick: () => void;
  handleResetNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("NotificationIcon must be used inside NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const closePopoverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
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
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to subscribe");
      setPermission("granted");
      setIsSubscribed(true);
      alert("Notifications enabled!");
    } catch (error) {
      alert(`Failed to enable: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Notification",
          body: "Your notifications are working!",
          url: "/missions",
        }),
      });
      const data = await response.json();
      if (response.ok) alert("Test notification sent. Check your device.");
      else alert(data.error || "Failed to send test.");
    } catch (error) {
      alert(`Failed to send test: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleRemoveClick = () => setConfirmRemoveOpen(true);

  const handleResetNotifications = async () => {
    setResetLoading(true);
    try {
      const sub = await getSubscription();
      if (sub?.endpoint) {
        const response = await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to remove subscription");
        }
      }
      await unsubscribe();
      setIsSubscribed(false);
      setConfirmRemoveOpen(false);
      closePopoverRef.current?.();
      alert("Notifications removed for this device. You can enable them again anytime.");
    } catch (error) {
      alert(`Failed to remove: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setResetLoading(false);
    }
  };

  const value: NotificationContextValue = {
    permission,
    isSubscribed,
    loading,
    testLoading,
    resetLoading,
    confirmRemoveOpen,
    setConfirmRemoveOpen,
    closePopoverRef,
    checkSubscription,
    handleEnableNotifications,
    handleTestNotification,
    handleRemoveClick,
    handleResetNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/** Bell icon + popover (Headless UI). Green when subscribed, orange + shake when not. */
export function NotificationIcon() {
  const ctx = useNotification();
  const {
    permission,
    isSubscribed,
    loading,
    testLoading,
    resetLoading,
    confirmRemoveOpen,
    setConfirmRemoveOpen,
    closePopoverRef,
    handleEnableNotifications,
    handleTestNotification,
    handleRemoveClick,
    handleResetNotifications,
  } = ctx;

  const enabled = permission === "granted" && isSubscribed;

  return (
    <>
      <Popover className="relative">
        <PopoverButton
          className={`p-2 rounded-lg transition-colors ${enabled
            ? "text-green-600 hover:text-green-700 hover:bg-green-50"
            : "text-orange-500 hover:text-orange-600 hover:bg-orange-50 animate-shake"
          }`}
          aria-label="Reminder notifications"
        >
          <BellIcon />
        </PopoverButton>
        <PopoverPanel
          anchor={{ to: "bottom start", gap: "4px", padding: 8 }}
          className="z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-lg py-2 focus:outline-none"
        >
          {({ close }) => {
            closePopoverRef.current = close;
            return (
              <>
                <div className="px-3 py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Notifications</span>
                </div>
                <div className="p-3">
                  {!enabled ? (
                    permission === "denied" ? (
                      <p className="text-sm text-red-700">Notifications blocked. Enable in browser settings.</p>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-1">Enable notification</h3>
                          <p className="text-sm text-gray-600">You will be notified when tasks are due.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleEnableNotifications}
                          disabled={loading}
                          className="btn-primary w-full py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Enabling…
                            </>
                          ) : (
                            "Enable Notifications"
                          )}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">You are all set!</h3>
                        <p className="text-sm text-gray-600">
                          You will receive notifications when tasks are due.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleTestNotification}
                          disabled={testLoading || resetLoading}
                          className="btn-secondary flex-1 py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                        {testLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending…
                          </>
                        ) : (
                          "Test"
                        )}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveClick}
                          disabled={testLoading || resetLoading}
                          className="flex-1 py-2 px-3 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          }}
        </PopoverPanel>
      </Popover>

      <Transition appear show={confirmRemoveOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[60]" onClose={() => !resetLoading && setConfirmRemoveOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-gray-200 p-5">
                <Dialog.Title className="text-base font-semibold text-gray-900">
                  Remove notifications?
                </Dialog.Title>
                <p className="text-sm text-gray-600 mt-2">
                  This will stop notifications on this device only. You can turn them on again anytime.
                </p>
                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveOpen(false)}
                    disabled={resetLoading}
                    className="btn-secondary py-2 px-4 rounded-lg text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetNotifications}
                    disabled={resetLoading}
                    className="btn-danger py-2 px-4 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Removing…
                      </>
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

export default NotificationProvider;
