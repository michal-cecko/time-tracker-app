import { Icon } from './Icon';

export type Tab = 'today' | 'projects' | 'timer' | 'calendar' | 'reports';

export function TabBar({ tab, onChange, onTimer }: { tab: Tab; onChange: (t: Tab) => void; onTimer: () => void }) {
  return (
    <div className="tabbar">
      <div className="inner">
        <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => onChange('today')}>
          <Icon.Home size={20} /><span>Today</span>
        </button>
        <button className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => onChange('projects')}>
          <Icon.Folder size={20} /><span>Projects</span>
        </button>
        <button className="tab" onClick={onTimer} aria-label="Timer">
          <span className="fab"><Icon.Clock size={22} /></span>
        </button>
        <button className={`tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => onChange('calendar')}>
          <Icon.Calendar size={20} /><span>Calendar</span>
        </button>
        <button className={`tab ${tab === 'reports' ? 'active' : ''}`} onClick={() => onChange('reports')}>
          <Icon.Chart size={20} /><span>Reports</span>
        </button>
      </div>
    </div>
  );
}
