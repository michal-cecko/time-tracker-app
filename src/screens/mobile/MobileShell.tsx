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
import { onRealtime } from '@/api/websocket';
import { useRunning } from '@/state/running';
import { initNotifications, setNotificationHandlers, showTrackingNotification, cancelTrackingNotification, scheduleIdleReminder } from '@/native/notifications';
import type { Settings, Task, TimeEntry } from '@/api/types';
import { isNative } from '@/utils/platform';

export function MobileShell() {
  const { tab, setTab, stack, push, back } = useNav();
  const setRunning = useRunning((s) => s.setRunning);
  const running = useRunning((s) => s.running);
  const idleMinRef = useRef(60); // sane default until /me/settings loads

  // Boot the notification plugin once and wire its action buttons to app handlers.
  useEffect(() => {
    initNotifications();
    setNotificationHandlers({
      onPause: async () => {
        try { await api('/time-entries/stop', { method: 'POST' }); } catch {}
        setRunning(null);
      },
      onOpenTask: (taskId: string) => push({ kind: 'task', id: taskId }),
    });
    // Read the user's preferred reminder interval so the next start uses it.
    (async () => {
      try {
        const me = await api<{ settings: Settings }>('/me');
        if (me.settings?.idleDetectionMin) idleMinRef.current = me.settings.idleDetectionMin;
      } catch {}
    })();
  }, [push, setRunning]);

  // Hydrate the running-timer state on boot + keep it live via WS.
  useEffect(() => {
    const hydrate = async () => {
      try {
        const r = await api<TimeEntry | null>('/time-entries/running');
        if (r?.id) {
          let title: string | undefined;
          try {
            const t = await api<Task>(`/tasks/${r.taskId}`);
            title = t.title;
          } catch {}
          setRunning({ entryId: r.id, taskId: r.taskId, taskTitle: title, startedAt: r.startedAt });
        } else {
          setRunning(null);
        }
      } catch {}
    };
    hydrate();
    const offs = [
      onRealtime('timer.started', hydrate),
      onRealtime('timer.stopped', () => setRunning(null)),
    ];
    return () => offs.forEach((o) => o());
  }, [setRunning]);

  // Drive the OS notification: present whenever there's a running timer,
  // cancel when there isn't. Also (re)schedule a "still tracking?" reminder.
  useEffect(() => {
    if (running) {
      const title = running.taskTitle ?? 'Task';
      showTrackingNotification({
        taskTitle: title,
        taskId: running.taskId,
        startedAt: running.startedAt,
      });
      scheduleIdleReminder({ taskTitle: title, taskId: running.taskId, minutes: idleMinRef.current });
    } else {
      cancelTrackingNotification();
    }
  }, [running?.entryId, running?.taskId, running?.taskTitle]);

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
