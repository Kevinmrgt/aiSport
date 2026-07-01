import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './ui/Icon';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'soft' | 'strong';
}

export function GlassPanel({ children, className = '', variant = 'default' }: GlassPanelProps) {
  const variantClass =
    variant === 'strong' ? 'glass-strong' : variant === 'soft' ? 'glass-soft' : 'glass-panel';

  return <div className={`${variantClass} ${className}`}>{children}</div>;
}

interface IconBubbleProps {
  icon: IconName;
  label?: string;
  className?: string;
}

export function IconBubble({ icon, label, className = '' }: IconBubbleProps) {
  return (
    <span className={`icon-bubble ${className}`} aria-label={label}>
      <Icon name={icon} className="h-4 w-4" />
    </span>
  );
}

interface MetricPillProps {
  icon?: IconName;
  label: string;
  value: string;
  tone?: 'lime' | 'orange' | 'neutral';
}

export function MetricPill({ icon, label, value, tone = 'neutral' }: MetricPillProps) {
  const toneClass =
    tone === 'lime'
      ? 'border-primary-300/[0.35] bg-primary-300/[0.12] text-primary-100'
      : tone === 'orange'
        ? 'border-sport-orange/[0.35] bg-sport-orange/[0.12] text-sport-orange'
        : 'border-white/[0.12] bg-white/[0.08] text-zinc-100';

  return (
    <div className={`rounded-full border px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-xl ${toneClass}`}>
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} className="h-4 w-4 shrink-0" />}
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">
            {label}
          </p>
          <p className="truncate text-sm font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressRing({ value, label, size = 'md' }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const sizeClass = size === 'lg' ? 'h-36 w-36' : size === 'sm' ? 'h-20 w-20' : 'h-28 w-28';

  return (
    <div
      className={`relative grid ${sizeClass} shrink-0 place-items-center rounded-full`}
      style={{
        background: `conic-gradient(#d9ff3f ${clamped * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
      }}
      role="img"
      aria-label={`${label}: ${clamped}%`}
    >
      <div className="absolute inset-2 rounded-full bg-zinc-950/80 shadow-inner shadow-black/40" />
      <div className="relative text-center">
        <p className="text-2xl font-black tabular-nums text-white">{clamped}%</p>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  imageSrc?: string;
  imageAlt?: string;
  priority?: boolean;
}

export function PhoneFrame({
  children,
  className = '',
  imageSrc,
  imageAlt = '',
  priority = false,
}: PhoneFrameProps) {
  return (
    <div className={`phone-frame min-h-[34rem] ${className}`}>
      {imageSrc && (
        <>
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 768px) 80vw, 360px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/5 via-zinc-950/[0.15] to-zinc-950/[0.88]" />
        </>
      )}
      <div className="relative z-10 flex min-h-[34rem] flex-col justify-end p-5 pt-16">{children}</div>
    </div>
  );
}

interface HeroVisualProps {
  className?: string;
}

export function HeroVisual({ className = '' }: HeroVisualProps) {
  return (
    <div className={`relative min-h-[38rem] ${className}`}>
      <div className="absolute left-0 top-16 hidden w-[18rem] rotate-[-6deg] opacity-90 sm:block">
        <PhoneFrame imageSrc="/visuals/login-athlete.webp">
          <div className="space-y-4">
            <p className="text-2xl font-black leading-tight text-white">
              Routine
              <span className="block text-primary-300">active</span>
            </p>
            <GlassPanel variant="soft" className="space-y-3 p-4">
              <div className="flex justify-between text-xs font-bold text-zinc-300">
                <span>Intensite</span>
                <span>72%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[72%] rounded-full bg-primary-300" />
              </div>
            </GlassPanel>
          </div>
        </PhoneFrame>
      </div>

      <div className="absolute left-1/2 top-0 w-[20rem] -translate-x-1/2 sm:w-[22rem]">
        <PhoneFrame imageSrc="/visuals/hero-athlete-lime.webp" priority>
          <div className="space-y-4">
            <p className="section-kicker">Alcide Pulse</p>
            <h2 className="text-4xl font-black leading-none text-white">
              Plan
              <span className="block text-primary-300">training</span>
            </h2>
            <GlassPanel className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                    Seance
                  </p>
                  <p className="mt-1 text-xl font-black text-white">Cardio force</p>
                </div>
                <IconBubble icon="zap" className="bg-primary-300 text-zinc-950" />
              </div>
            </GlassPanel>
          </div>
        </PhoneFrame>
      </div>

      <div className="absolute right-0 top-28 hidden w-[18rem] rotate-[5deg] opacity-95 lg:block">
        <PhoneFrame imageSrc="/visuals/workout-action.webp">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <IconBubble icon="arrow-left" />
              <IconBubble icon="home" />
            </div>
            <GlassPanel className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black text-white">Progression</p>
                <span className="premium-chip">Auto</span>
              </div>
              <ProgressRing value={68} label="cycle" />
              <div className="grid grid-cols-2 gap-2">
                <MetricPill icon="timer" label="duree" value="42 min" />
                <MetricPill icon="flame" label="effort" value="7/10" tone="orange" />
              </div>
            </GlassPanel>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  href: string;
  cta: string;
}

export function EmptyState({ title, description, href, cta }: EmptyStateProps) {
  return (
    <GlassPanel className="relative mx-auto max-w-2xl overflow-hidden p-8 text-center">
      <Image
        src="/visuals/empty-state-glow.webp"
        alt=""
        fill
        sizes="(max-width: 768px) 90vw, 640px"
        className="-z-10 object-cover opacity-40"
      />
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary-300 text-zinc-950 shadow-2xl shadow-primary-400/30">
        <Icon name="spark" className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="muted-copy mx-auto mt-3 max-w-md">{description}</p>
      <Link href={href} className="action-primary mt-6 w-full sm:w-auto">
        {cta}
      </Link>
    </GlassPanel>
  );
}
