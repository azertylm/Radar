import React from 'react';
import {
  Bookmark,
  Check,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  Headphones,
  Newspaper,
  Play,
  Radio,
  Share2,
  Tv,
  Users,
} from 'lucide-react';
import { ContentFormat, FomoUrgency, RadarContentItem } from '../types/radar';
import { getDirectPlatformLink } from '../utils/radarEngine';

interface ContentCardProps {
  item: RadarContentItem;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
  compact?: boolean;
}

export function getUrgencyMeta(urgency: FomoUrgency, expiresInHours?: number) {
  if (urgency === 'live') {
    return {
      label: 'En direct',
      dotColor: 'bg-rose-600 dark:bg-rose-500',
      textColor: 'text-rose-700 dark:text-rose-400',
      isLive: true,
    };
  }
  if (urgency === 'expiring') {
    return {
      label: expiresInHours ? `Expire dans ${expiresInHours}h` : 'Expire bientôt',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-700 dark:text-amber-400',
      isLive: false,
    };
  }
  return {
    label: 'Quand tu veux',
    dotColor: 'bg-emerald-600 dark:bg-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    isLive: false,
  };
}

export function getFormatIcon(format: ContentFormat) {
  switch (format) {
    case 'TV/Replay':
      return Tv;
    case 'Podcasts':
      return Headphones;
    case 'Presse':
      return Newspaper;
    case 'Réseaux sociaux':
      return Share2;
    case 'Streaming':
      return Radio;
    case 'YouTube':
    default:
      return Play;
  }
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  isSaved,
  onToggleSave,
  onOpenDetail,
  compact = false,
}) => {
  const urgencyMeta = getUrgencyMeta(item.urgency, item.expiresInHours);
  const FormatIcon = getFormatIcon(item.format);
  const linkInfo = getDirectPlatformLink(item);

  const verb =
    item.format === 'Podcasts'
      ? 'Écouter sur'
      : item.format === 'Presse' || item.format === 'Réseaux sociaux'
      ? 'Lire sur'
      : 'Regarder sur';

  return (
    <article className="group rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800/90 p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between gap-4">
      <div>
        {/* Top Metadata Line — Clean Unboxed Text with Typographic Separators */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
          <div className="flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className={`inline-flex items-center gap-1.5 font-semibold ${urgencyMeta.textColor}`}>
              <span
                className={`w-2 h-2 rounded-full ${urgencyMeta.dotColor} ${
                  urgencyMeta.isLive ? 'animate-ping' : ''
                }`}
                aria-hidden="true"
              />
              <span>{urgencyMeta.label}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{item.category}</span>
            <span aria-hidden="true">·</span>
            <a
              href={linkInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 hover:underline"
            >
              <FormatIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{item.source}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            {item.isOutOfBubble && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Découverte hors-bulle</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{item.durationMinutes} min</span>
          </div>
        </div>

        {/* Title (Opens direct link or detail modal) */}
        <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-snug mb-2">
          <a
            href={linkInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
          >
            {item.title}
          </a>
        </h3>

        {/* Summary */}
        {!compact && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-3">
            {item.summary}
          </p>
        )}

        {/* Taste Twins & Direct Domain Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span className="tabular-nums">
              {item.twinCount} Jumeaux ({item.twinMatchPercent} %)
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{item.creator}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">{linkInfo.domain}</span>
        </div>
      </div>

      {/* Action Footer: Direct External Link + Quick Preview/Audio + Save */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Primary Direct Link Button */}
          <a
            href={linkInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <span>
              {verb} {linkInfo.platformLabel}
            </span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          {/* Quick Preview & Voice Reader Modal Button */}
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            aria-label={`Aperçu et résumé vocal pour ${item.title}`}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Résumé</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(item.id)}
          aria-pressed={isSaved}
          aria-label={
            isSaved
              ? `Retirer "${item.title}" de Ma Liste`
              : `Sauvegarder "${item.title}" dans Ma Liste`
          }
          className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isSaved
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300'
              : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Sauvegardé</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sauvegarder</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
