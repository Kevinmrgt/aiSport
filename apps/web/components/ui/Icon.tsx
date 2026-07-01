import type { SVGProps } from 'react';

export type IconName =
  | 'activity'
  | 'arrow-left'
  | 'arrow-right'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'clock'
  | 'flame'
  | 'home'
  | 'layers'
  | 'log-out'
  | 'menu'
  | 'plus'
  | 'settings'
  | 'spark'
  | 'target'
  | 'timer'
  | 'trash'
  | 'user'
  | 'zap';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

const PATHS: Record<IconName, string> = {
  activity: 'M4 12h4l2-7 4 14 2-7h4',
  'arrow-left': 'M19 12H5m6-6-6 6 6 6',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  calendar: 'M7 3v4m10-4v4M5 8h14M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  chart: 'M5 19V9m7 10V5m7 14v-7',
  check: 'm5 13 4 4L19 7',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  flame: 'M12 21c-3.3 0-6-2.4-6-5.8 0-2.9 1.9-5.1 4-7.2.2 2 1.1 3 2.2 3.8.5-2.8 2.1-5 3.8-6.8.4 3.6 3 5.5 3 9.4 0 3.4-2.7 5.8-6 5.8Z',
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-7 9 7 4 7-4M5 16l7 4 7-4',
  'log-out': 'M10 17l5-5-5-5m5 5H3m7-9h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-2.7a7.8 7.8 0 0 0 0-1.6l2-1.5-2-3.5-2.4 1a8.5 8.5 0 0 0-1.4-.8L15.3 3h-4.6l-.3 2.4c-.5.2-1 .5-1.4.8l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0 0 1.6l-2 1.5 2 3.5 2.4-1c.4.3.9.6 1.4.8l.3 2.4h4.6l.3-2.4c.5-.2 1-.5 1.4-.8l2.4 1 2-3.5-2-1.5Z',
  spark: 'm12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Zm6 12 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  timer: 'M10 2h4M12 8v5l3 2m4-3a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  trash: 'M5 7h14m-9 4v6m4-6v6M9 7l1-3h4l1 3m-8 0 1 13h8l1-13',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 9a8 8 0 1 0-16 0',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
};

export function Icon({ name, className = 'h-4 w-4', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
