import { useEffect, useRef } from 'react';
import { TabBar, type Tab } from '@/components/ui/TabBar';
import { MiniTimerBar } from '@/components/ui/MiniTimerBar';
import { useNav } from '@/state/stack';
import { TodayScreen } from './Today';
import { ProjectsScreen } from './Projects';
import { ProjectDetailScreen } from './ProjectDetail';
import { TaskDetailScreen } from './TaskDetail';
import { CalendarScreen } from './Calendar';
import { ReportsScreen } from './Reports';
import { HistoryScreen } from './History';
import { SearchScreen } from './Search';
import { QuickAddSheet } from './QuickAdd';
import { ManualEntryScreen } from './ManualEntry';
import { SettingsScreen } from './Settings';
import { api } from '@/api/client';
import { entries as entriesApi } from '@/api/mutations';
import { onRealtime } from '@/api/websocket';
import { useRunning, combinedElapsed, fetchRunningTimers } from '@/state/running';
import { initNotifications, setNotificationHandlers, showTrackingNotification, showMultiTrackingNotification, cancelTrackingNotification, scheduleIdleReminder, showAutoStoppedNotification } from '@/native/notifications';
import type { Settings } from '@/api/types';
import { isNative } from '@/utils/platform';

export function MobileShell() {
  const { tab, setTab, stack, push, back } = useNav();
  const setTimers = useRunning((s) => s.setTimers);
  const removeTimer = useRunning((s) => s.removeTimer);
  const timers = useRunning((s) => s.timers);
  const idleMinRef = useRef(60); // sane default until /me/settings loads

  // Android hardware-back: close any open sheet → else pop the nav stack →
  // else minimize the app instead of exiting. Web/iOS skip this entirely.
  useEffect(() => {
    if (!isNative()) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      const { App } = await import('@capacitor/app');
      const handle = await App.addListener('backButton', () => {
        // 1. A sheet/modal is up — dismiss it by clicking its backdrop.
        //    Every sheet in the app uses .sheet-backdrop and closes on backdrop click.
        const backdrops = document.querySelectorAll<HTMLElement>('.sheet-backdrop');
        if (backdrops.length > 0) {
          backdrops[backdrops.length - 1].click();
          return;
        }
        // 2. A pushed screen is on top — pop one level.
        const state = useNav.getState();
        if (state.stack.length > 0) {
          state.back();
          return;
        }
        // 3. At the root tab — minimize instead of killing the app.
        App.minimizeApp().catch(() => {});
      });
      cleanup = () => handle.remove();
    })();
    return () => { cleanup?.(); };
  }, []);

  // Boot the notification plugin once and wire its action buttons to app handlers.
  useEffect(() => {
    initNotifications();
    setNotificationHandlers({
      onPause: async () => {
        // The ongoing notification represents the whole set; its Pause stops the
        // most recently started timer (the primary).
        const primary = useRunning.getState().timers[0];
        if (!primary) return;
        removeTimer(primary.entryId);
        try { await entriesApi.stopTimer(primary.entryId); } catch {}
      },
      onOpenTask: (taskId: string) => push({ kind: 'task', id: taskId }),
      // Tapping "Review" on the auto-stop notification jumps straight into the
      // manual-entry sheet for that entry so the user can trim or delete it.
      onReviewEntry: (entryId: string) => push({ kind: 'manual', entryId }),
    });
    // Read the user's preferred reminder interval so the next start uses it.
    (async () => {
      try {
        const me = await api<{ settings: Settings }>('/me');
        if (me.settings?.idleDetectionMin) idleMinRef.current = me.settings.idleDetectionMin;
      } catch {}
    })();
  }, [push, removeTimer]);

  // Hydrate the running-timer set on boot + keep it live via WS.
  useEffect(() => {
    const hydrate = async () => {
      try { setTimers(await fetchRunningTimers()); } catch {}
    };
    hydrate();
    const offs = [
      onRealtime('timer.started', hydrate),
      onRealtime('timer.stopped', (e: { entryId?: string }) => {
        if (e?.entryId) removeTimer(e.entryId); else hydrate();
      }),
      onRealtime('timer.autoStopped', (e: { entryId: string; taskTitle: string; durationSeconds: number }) => {
        removeTimer(e.entryId);
        showAutoStoppedNotification({
          taskTitle: e.taskTitle,
          entryId: e.entryId,
          durationSeconds: e.durationSeconds,
        });
      }),
    ];
    return () => offs.forEach((o) => o());
  }, [setTimers, removeTimer]);

  // Drive the OS notification from the running set: cancel when empty, show the
  // single task when one runs, or a "N timers" summary when several do.
  const primary = timers[0] ?? null;
  useEffect(() => {
    if (timers.length === 0) {
      cancelTrackingNotification();
      return;
    }
    if (timers.length === 1 && primary) {
      const title = primary.taskTitle ?? 'Task';
      showTrackingNotification({ taskTitle: title, taskId: primary.taskId ?? '', startedAt: primary.startedAt });
      scheduleIdleReminder({ taskTitle: title, taskId: primary.taskId ?? '', minutes: idleMinRef.current });
    } else if (primary) {
      showMultiTrackingNotification({
        count: timers.length,
        combinedSeconds: combinedElapsed(timers, Date.now()),
        taskId: primary.taskId ?? '',
      });
    }
  }, [timers.length, primary?.entryId, primary?.taskTitle]);

  const top = stack[stack.length - 1];

  const renderBaseTab = () => {
    switch (tab) {
      case 'today':    return <TodayScreen />;
      case 'projects': return <ProjectsScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'reports':  return <ReportsScreen />;
      default:         return <TodayScreen />;
    }
  };

  const renderTop = () => {
    if (!top) return renderBaseTab();
    switch (top.kind) {
      case 'task':       return <TaskDetailScreen id={top.id} onBack={back} />;
      case 'project':    return <ProjectDetailScreen id={top.id} onBack={back} />;
      case 'history':    return <HistoryScreen onBack={back} />;
      case 'search':     return <SearchScreen onBack={back} />;
      case 'settings':   return <SettingsScreen onBack={back} />;
      case 'manual':     return <ManualEntryScreen entryId={top.entryId} taskId={top.taskId} onBack={back} />;
      default:           return renderBaseTab();
    }
  };

  const modal = stack.find((e) => e.kind === 'quickAdd' || e.kind === 'syncSheet');

  return (
    <>
      {renderTop()}
      <MiniTimerBar onOpen={(id) => push({ kind: 'task', id })} />
      <TabBar tab={tab} onChange={setTab} onTimer={() => push({ kind: 'quickAdd' })} />
      {modal?.kind === 'quickAdd' && <QuickAddSheet onClose={back} />}
    </>
  );
}
