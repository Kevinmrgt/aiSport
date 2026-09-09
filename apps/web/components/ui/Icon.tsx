import type { SVGProps } from 'react';
import { ActivityIcon } from '@phosphor-icons/react/dist/ssr/Pulse';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ChartBarIcon } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { StackIcon } from '@phosphor-icons/react/dist/ssr/Stack';
import { SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { CornersInIcon } from '@phosphor-icons/react/dist/ssr/CornersIn';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SlidersHorizontalIcon } from '@phosphor-icons/react/dist/ssr/SlidersHorizontal';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { TargetIcon } from '@phosphor-icons/react/dist/ssr/Target';
import { TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { BarbellIcon } from '@phosphor-icons/react/dist/ssr/Barbell';
import { PersonSimpleRunIcon } from '@phosphor-icons/react/dist/ssr/PersonSimpleRun';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { PlayIcon } from '@phosphor-icons/react/dist/ssr/Play';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';

const ICONS = {
  activity: ActivityIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  calendar: CalendarBlankIcon,
  chart: ChartBarIcon,
  check: CheckIcon,
  clock: ClockIcon,
  flame: FireIcon,
  home: HouseIcon,
  layers: StackIcon,
  'log-out': SignOutIcon,
  menu: ListIcon,
  minimize: CornersInIcon,
  plus: PlusIcon,
  settings: SlidersHorizontalIcon,
  spark: SparkleIcon,
  target: TargetIcon,
  timer: TimerIcon,
  trash: TrashIcon,
  user: UserIcon,
  zap: LightningIcon,
  barbell: BarbellIcon,
  run: PersonSimpleRunIcon,
  heart: HeartIcon,
  sliders: SlidersHorizontalIcon,
  list: ListBulletsIcon,
  pause: PauseIcon,
  play: PlayIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
};
export type IconName = keyof typeof ICONS;
interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}
export function Icon({ name, className = 'h-5 w-5', ...props }: IconProps) {
  const Component = ICONS[name];
  return <Component aria-hidden="true" weight="regular" className={className} {...props} />;
}
