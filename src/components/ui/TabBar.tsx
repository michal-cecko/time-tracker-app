import { Icon } from './Icon';

export type Tab = 'today' | 'projects' | 'timer' | 'calendar' | 'reports';

// Icons-only tab bar. Labels are encoded as aria-label / title for
// accessibility but never rendered on screen.
export function TabBar({ tab, onChange, onTimer }: { tab: Tab; onChange: (t: Tab) => void; onTimer: () => void }) {
  return (
    <div className="tabbar">
      <div className="inner">
        <button
          className={`tab ${tab === 'today' ? 'active' : ''}`}
          onClick={() => onChange('today')}
          aria-label="Today" title="Today"
        ><Icon.Home size={22} /></button>
        <button
          className={`tab ${tab === 'projects' ? 'active' : ''}`}
          onClick={() => onChange('projects')}
          aria-label="Projects" title="Projects"
        ><Icon.Folder size={22} /></button>
        <button className="tab" onClick={onTimer} aria-label="New task / Timer" title="New task">
          <span className="fab"><Icon.Plus size={22} /></span>
        </button>
        <button
          className={`tab ${tab === 'calendar' ? 'active' : ''}`}
          onClick={() => onChange('calendar')}
          aria-label="Calendar" title="Calendar"
        ><Icon.Calendar size={22} /></button>
        <button
          className={`tab ${tab === 'reports' ? 'active' : ''}`}
          onClick={() => onChange('reports')}
          aria-label="Reports" title="Reports"
        ><Icon.Chart size={22} /></button>
      </div>
    </div>
  );
}
