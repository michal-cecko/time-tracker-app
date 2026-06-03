// Notification glue between the app's running-timer state and Capacitor's
// LocalNotifications plugin. Wired up in MobileShell:
//
//   useRunning.running !== null  →  showTrackingNotification(...)
//   useRunning.running === null  →  cancelTrackingNotification()
//
// On native (Android/iOS) the notification persists as an ongoing item with
// Pause + Open Task action buttons. On the web it's a no-op — the import is
// dynamic so the web bundle doesn't pay for the plugin.

import { fmtClock } from '@/utils/format';

const TRACKING_ID = 1;
const IDLE_ID = 2;
const AUTOSTOP_ID = 3;
const ACTION_TYPE = 'LAPSE_TIMER';
const AUTOSTOP_ACTION = 'LAPSE_AUTOSTOP';

type LN = typeof import('@capacitor/local-notifications').LocalNotifications;

let cached: LN | null = null;
let actionsRegistered = false;
let pauseHandler: () => void = () => {};
let openHandler: (taskId: string) => void = () => {};
let reviewHandler: (entryId: string) => void = () => {};

async function ln(): Promise<LN | null> {
  if (typeof window === 'undefined') return null;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  if (cached) return cached;
  try {
    cached = (await import('@capacitor/local-notifications')).LocalNotifications;
    return cached;
  } catch {
    return null;
  }
}

export function setNotificationHandlers(opts: {
  onPause: () => void;
  onOpenTask: (taskId: string) => void;
  onReviewEntry?: (entryId: string) => void;
}) {
  pauseHandler = opts.onPause;
  openHandler = opts.onOpenTask;
  if (opts.onReviewEntry) reviewHandler = opts.onReviewEntry;
}

/** Call once at app boot (after auth). Idempotent. Requests permission. */
export async function initNotifications() {
  const N = await ln();
  if (!N) return;
  try { await N.requestPermissions(); } catch {}

  if (!actionsRegistered) {
    try {
      await N.registerActionTypes({
        types: [
          {
            id: ACTION_TYPE,
            actions: [
              { id: 'pause', title: 'Pause' },
              { id: 'open',  title: 'Open task' },
            ],
          },
          {
            id: AUTOSTOP_ACTION,
            actions: [
              { id: 'review', title: 'Review' },
            ],
          },
        ],
      });
    } catch {}
    actionsRegistered = true;
  }

  // Tap on the notification body OR an action button → run the handler.
  N.addListener('localNotificationActionPerformed', (e) => {
    const extra = (e.notification?.extra ?? {}) as { taskId?: string; entryId?: string; kind?: string };
    if (e.actionId === 'pause') {
      pauseHandler();
      return;
    }
    if (e.actionId === 'review' || extra.kind === 'autostop') {
      if (extra.entryId) reviewHandler(extra.entryId);
      return;
    }
    if (extra.taskId) openHandler(extra.taskId);
  }).catch(() => {});
}

interface ShowOpts {
  taskTitle: string;
  taskId: string;
  startedAt: string;
}

export async function showTrackingNotification({ taskTitle, taskId, startedAt }: ShowOpts) {
  const N = await ln();
  if (!N) return;
  try {
    await N.schedule({
      notifications: [{
        id: TRACKING_ID,
        title: `Tracking · ${taskTitle}`,
        body: `Started ${fmtClock(new Date(startedAt))} — tap to open`,
        ongoing: true,
        autoCancel: false,
        // Don't set `smallIcon` — the plugin falls back to the app icon when
        // omitted. Setting a non-existent drawable name silently kills the
        // notification on Android.
        actionTypeId: ACTION_TYPE,
        extra: { taskId },
      }],
    });
  } catch {}
}

/** Ongoing notification summarising several concurrent timers. Pause stops the
 *  primary (most recently started) timer; tapping opens the app. */
export async function showMultiTrackingNotification({ count, combinedSeconds, taskId }: { count: number; combinedSeconds: number; taskId: string }) {
  const N = await ln();
  if (!N) return;
  const h = Math.floor(combinedSeconds / 3600);
  const m = Math.floor((combinedSeconds % 3600) / 60);
  const combined = h > 0 ? `${h}h ${m}m` : `${m}m`;
  try {
    await N.schedule({
      notifications: [{
        id: TRACKING_ID,
        title: `Tracking · ${count} timers`,
        body: `${combined} combined — tap to manage`,
        ongoing: true,
        autoCancel: false,
        actionTypeId: ACTION_TYPE,
        extra: { taskId },
      }],
    });
  } catch {}
}

export async function cancelTrackingNotification() {
  const N = await ln();
  if (!N) return;
  try { await N.cancel({ notifications: [{ id: TRACKING_ID }, { id: IDLE_ID }] }); } catch {}
}

/** Schedules a one-shot "still tracking?" reminder N minutes after now.
 *  Re-call whenever the timer is started or task changes. */
export async function scheduleIdleReminder({ taskTitle, taskId, minutes }: { taskTitle: string; taskId: string; minutes: number }) {
  const N = await ln();
  if (!N) return;
  try { await N.cancel({ notifications: [{ id: IDLE_ID }] }); } catch {}
  if (!minutes || minutes <= 0) return;
  try {
    await N.schedule({
      notifications: [{
        id: IDLE_ID,
        title: 'Still tracking?',
        body: `"${taskTitle}" has been running for ${minutes}m.`,
        schedule: { at: new Date(Date.now() + minutes * 60_000) },
        actionTypeId: ACTION_TYPE,
        extra: { taskId },
      }],
    });
  } catch {}
}

/** Shown when the server's midnight cron force-stopped a running entry. */
export async function showAutoStoppedNotification({
  taskTitle,
  entryId,
  durationSeconds,
}: {
  taskTitle: string;
  entryId: string;
  durationSeconds: number;
}) {
  const N = await ln();
  if (!N) return;
  const hours = Math.round((durationSeconds / 3600) * 10) / 10;
  try {
    await N.schedule({
      notifications: [{
        id: AUTOSTOP_ID,
        title: 'Auto-stopped at midnight',
        body: `"${taskTitle}" had been running for ${hours}h. Tap to review the entry.`,
        actionTypeId: AUTOSTOP_ACTION,
        extra: { entryId, kind: 'autostop' },
      }],
    });
  } catch {}
}
