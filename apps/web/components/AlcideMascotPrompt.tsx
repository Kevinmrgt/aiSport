import Image from 'next/image';
import { Icon, type IconName } from './ui/Icon';

interface AlcideMascotPromptProps {
  title: string;
  description: string;
  icon?: IconName;
  className?: string;
}

export function AlcideMascotPrompt({
  title,
  description,
  icon = 'spark',
  className = '',
}: AlcideMascotPromptProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border border-primary-300/[0.22] bg-zinc-950/[0.48] p-4 shadow-2xl shadow-primary-400/10 backdrop-blur-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(217,255,63,0.2),transparent_14rem),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <div className="relative flex items-end gap-4">
        <div className="relative h-32 w-28 shrink-0 self-end sm:h-36 sm:w-32">
          <Image
            src="/visuals/alcide-mascot-creature.png"
            alt="Mascotte Alcide"
            fill
            sizes="128px"
            className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="min-w-0 pb-1">
          <span className="premium-chip mb-3">
            <Icon name={icon} className="h-3.5 w-3.5" />
            Alcide
          </span>
          <p className="break-words text-xl font-black leading-tight text-white">{title}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{description}</p>
        </div>
      </div>
    </div>
  );
}
