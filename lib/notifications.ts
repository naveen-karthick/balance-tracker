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
  console.log('Checking notification support...');
  
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  console.log('Requesting permission...');
  const permission = await Notification.requestPermission();
  console.log('Permission result:', permission);
  
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  console.log('Waiting for service worker...');
  
  // Check if service worker is registered
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log('Service worker registrations:', registrations.length);
  
  if (registrations.length === 0) {
    // Try to register it now
    console.log('No service worker found, registering...');
    await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered, waiting for ready...');
  }
  
  const registration = await navigator.serviceWorker.ready;
  console.log('Service worker ready, subscribing to push...');

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  console.log('VAPID key available:', !!vapidKey);
  
  if (!vapidKey) {
    throw new Error('VAPID public key not configured');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  console.log('Push subscription created:', subscription.endpoint);
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
