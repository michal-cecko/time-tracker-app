// 18px stroke icon set — mirrors the prototype's inline SVGs.
import type { SVGProps } from 'react';

type IProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: IProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Home:    (p: IProps) => <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></Svg>,
  Folder:  (p: IProps) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Svg>,
  Clock:   (p: IProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  Calendar:(p: IProps) => <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>,
  Chart:   (p: IProps) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></Svg>,
  Play:    (p: IProps) => <Svg {...p} fill="currentColor"><path d="M8 5v14l11-7Z" stroke="none" /></Svg>,
  Pause:   (p: IProps) => <Svg {...p} fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" stroke="none" /></Svg>,
  Stop:    (p: IProps) => <Svg {...p} fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" stroke="none" /></Svg>,
  Plus:    (p: IProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  Search:  (p: IProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>,
  Settings:(p: IProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.55 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.55 9 1.7 1.7 0 0 0 4.2 7.13l-.06-.06A2 2 0 1 1 6.97 4.24l.06.06A1.7 1.7 0 0 0 9 4.55 1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.55a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.45 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1.0Z" /></Svg>,
  Tweaks:  (p: IProps) => <Svg {...p}><circle cx="5" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><circle cx="19" cy="7" r="2" /><path d="M5 9v8M12 5v10M19 9v8" /></Svg>,
  ChevronRight: (p: IProps) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>,
  ChevronLeft:  (p: IProps) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>,
  ChevronDown:  (p: IProps) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>,
  ChevronUp:    (p: IProps) => <Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>,
  X:       (p: IProps) => <Svg {...p}><path d="M6 6l12 12M6 18L18 6" /></Svg>,
  Check:   (p: IProps) => <Svg {...p}><path d="M5 12l5 5 9-11" /></Svg>,
  Edit:    (p: IProps) => <Svg {...p}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></Svg>,
  Trash:   (p: IProps) => <Svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></Svg>,
  History: (p: IProps) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v5l3 2" /></Svg>,
  CloudOff:(p: IProps) => <Svg {...p}><path d="M2 2l20 20" /><path d="M5.5 9.5A4 4 0 0 1 9 5.5h.5a6 6 0 0 1 11 3.5h.5a3.5 3.5 0 0 1 2.4 6" /><path d="M3 13.5A4 4 0 0 0 7 17h11" /></Svg>,
  Cloud:   (p: IProps) => <Svg {...p}><path d="M17.5 19a4.5 4.5 0 0 0 0-9h-1A6.5 6.5 0 0 0 4 12.5V13a4 4 0 0 0 4 4h9.5Z" /></Svg>,
  More:    (p: IProps) => <Svg {...p}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Svg>,
  Filter:  (p: IProps) => <Svg {...p}><path d="M3 5h18M6 12h12M10 19h4" /></Svg>,
  Archive: (p: IProps) => <Svg {...p}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></Svg>,
  Inbox:   (p: IProps) => <Svg {...p}><path d="M3 13l2-7h14l2 7M3 13v7h18v-7M3 13h5l1 2h6l1-2h5" /></Svg>,
  Target:  (p: IProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Svg>,
  Eye:     (p: IProps) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>,
  EyeOff:  (p: IProps) => <Svg {...p}><path d="M3 3l18 18" /><path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17.7 17.7 0 0 1-3.3 4.1" /><path d="M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 6 10 6a9.5 9.5 0 0 0 4.4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>,
  Flag:    (p: IProps) => <Svg {...p} fill="#e54336" stroke="#e54336"><path d="M4 21V4h12l-2 4 2 4H4" /></Svg>,
  Grid:    (p: IProps) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>,
  List:    (p: IProps) => <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>,
};
