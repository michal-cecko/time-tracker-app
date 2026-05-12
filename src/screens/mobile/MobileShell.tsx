import { useEffect } from 'react';
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
import { FocusScreen } from './Focus';
import { QuickAddSheet } from './QuickAdd';
import { ManualEntryScreen } from './ManualEntry';
import { SettingsScreen } from './Settings';
import { TweaksPanel } from './TweaksPanel';
import { api } from '@/api/client';
import { useRunning } from '@/state/running';

export function MobileShell() {
  const { tab, setTab, stack, push, back } = useNav();
  const setRunning = useRunning((s) => s.setRunning);

  // Boot: hydrate running timer state once.
  useEffect(() => {
    (async () => {
      try {
        const r = await api('/time-entries/running');
        if (r?.id) {
          setRunning({
            entryId: r.id,
            taskId: r.taskId,
            startedAt: r.startedAt,
          });
        }
      } catch {}
    })();
  }, [setRunning]);

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

  const modal = stack.find((e) => e.kind === 'tweaks' || e.kind === 'quickAdd' || e.kind === 'focus' || e.kind === 'syncSheet');

  return (
    <>
      {renderTop()}
      <MiniTimerBar onOpen={(id) => push({ kind: 'task', id })} />
      <TabBar tab={tab} onChange={setTab} onTimer={() => push({ kind: 'quickAdd' })} />
      {modal?.kind === 'tweaks'   && <TweaksPanel onClose={back} />}
      {modal?.kind === 'quickAdd' && <QuickAddSheet onClose={back} />}
      {modal?.kind === 'focus'    && <FocusScreen onClose={back} />}
    </>
  );
}
