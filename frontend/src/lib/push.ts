import { api } from "./api";

const b64 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** On iPhone, notifications only work once the app is added to the Home Screen. */
export const needsInstall = () =>
  /iphone|ipad/i.test(navigator.userAgent) && !(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone);

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush(): Promise<string | null> {
  if (!pushSupported()) return "This browser does not support notifications.";
  if (needsInstall()) return "On iPhone, first add Mochi Kcal to the Home Screen (Share → Add to Home Screen), then open it from there.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications are not allowed: you can turn them on in the phone settings.";
  const { key } = await api.pushKey();
  if (!key) return "Notifications are not set up on the server yet.";
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
  await api.subscribe(sub.toJSON());
  return null;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await api.unsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
