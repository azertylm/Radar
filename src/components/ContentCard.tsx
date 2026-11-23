import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  EyeOff,
  Gem,
  Headphones,
  ListChecks,
  Loader2,
  Newspaper,
  Play,
  Radio,
  Share2,
  ShieldAlert,
  Sparkles,
  Tv,
  Users,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ContentFormat, FomoUrgency, MuteDuration, RadarContentItem } from '../types/radar';
import { getDirectPlatformLink } from '../utils/radarEngine';

interface ContentCardProps {
  item: RadarContentItem;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
  onMuteKeyword?: (keyword: string, duration: MuteDuration) => void;
  onMarkSpoilerSeen?: (keyword: string) => void;
  compact?: boolean;
}

export function getUrgencyMeta(urgency: FomoUrgency, expiresInHours?: number) {
  if (urgency === 'live') {
    return {
      label: 'En direct maintenant',
      dotColor: 'bg-rose-600 dark:bg-rose-500',
      textColor: 'text-rose-700 dark:text-rose-400',
      isLive: true,
    };
  }
  if (urgency === 'expiring') {
    return {
      label: expiresInHours ? `Expire bientôt (${expiresInHours}h)` : 'Expire bientôt',
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
  onMuteKeyword,
  onMarkSpoilerSeen,
  compact = false,
}) => {
  const [showThreePoints, setShowThreePoints] = useState(false);
  const [customPoints, setCustomPoints] = useState<string[] | null>(null);
  const [isLoadingAiPoints, setIsLoadingAiPoints] = useState(false);
  const [spoilerRevealedLocally, setSpoilerRevealedLocally] = useState(false);

  const urgencyMeta = getUrgencyMeta(item.urgency, item.expiresInHours);
  const FormatIcon = getFormatIcon(item.format);
  const linkInfo = getDirectPlatformLink({
    ...item,
    highlightSeconds: item.highlightMoment?.seconds,
  });

  const verb =
    item.format === 'Podcasts'
      ? 'Écouter sur'
      : item.format === 'Presse' || item.format === 'Réseaux sociaux'
      ? 'Lire sur'
      : 'Regarder sur';

  const isShieldedByAntiSpoiler =
    Boolean(item.matchedSpoilerKeyword) && !spoilerRevealedLocally;

  const bulletPoints = customPoints || item.threeBulletPoints;

  const handleGenerateAiSummary = async () => {
    setIsLoadingAiPoints(true);
    try {
      const res = await fetch('/api/gemini/summarize-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          summary: item.summary,
          category: item.category,
        }),
      });
      const data = await res.json();
      if (data.points && Array.isArray(data.points)) {
        setCustomPoints(data.points);
      }
    } catch {
      // keep existing 3 bullet points
    } finally {
      setIsLoadingAiPoints(false);
    }
  };

  // If protected by Anti-Spoiler Shield, render the protective shield overlay card
  if (isShieldedByAntiSpoiler && item.matchedSpoilerKeyword) {
    return (
      <article className="rounded-2xl bg-slate-100 dark:bg-[#151A26] border border-amber-500/40 p-5 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Protégé par Bouclier Anti-Spoiler</span>
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {item.category} · {item.source}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Contenu masqué contenant « {item.matchedSpoilerKeyword} »
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Le titre et le résumé sont floutés pour ne pas vous divulgâcher le score ou l’intrigue avant votre visionnage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setSpoilerRevealedLocally(true)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Cliquer pour révéler</span>
          </button>

          {onMarkSpoilerSeen && (
            <button
              type="button"
              onClick={() => onMarkSpoilerSeen(item.matchedSpoilerKeyword!)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>C’est vu (désactiver ce bouclier)</span>
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group min-w-0 rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800/90 p-5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 flex flex-col justify-between gap-4">
      <div className="space-y-2.5">
        {/* Top Metadata Line — Clean Unboxed Text with Typographic Separators */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              {item.isFree ? 'Gratuit' : item.subscriptionLabel || 'Abonnement'}
            </span>
            {item.isHiddenGem && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Gem className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.viewsLabel || 'Pépite cachée'}</span>
                </span>
              </>
            )}
            {item.isOutOfBubble && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Hors-bulle</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{item.durationMinutes} min</span>
          </div>
        </div>

        {/* Title (Direct clickable link) */}
        <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-snug">
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
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
            {item.summary}
          </p>
        )}

        {/* MODULE 8B: "Saut au Moment Fort" for long lives, videos & podcasts (>= 30 min or with highlight) */}
        {item.highlightMoment && (
          <div className="pt-0.5">
            <a
              href={linkInfo.highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-1.5 transition-colors max-w-full"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="font-mono tabular-nums font-bold">
                Moment fort : {item.highlightMoment.timestamp}
              </span>
              <span>– {item.highlightMoment.label}</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-0.5" aria-hidden="true" />
            </a>
          </div>
        )}

        {/* MODULE 8A: "Résumé avant de cliquer" (3 points clés en 10 secondes) */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowThreePoints((prev) => !prev)}
            aria-expanded={showThreePoints}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ListChecks className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Résumé avant de cliquer (3 points clés en 10s)</span>
            {showThreePoints ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showThreePoints && (
            <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 list-disc pl-4">
                {bulletPoints.map((pt, i) => (
                  <li key={i} className="leading-relaxed">
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Synthèse express anti-clickbait
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAiSummary}
                  disabled={isLoadingAiPoints}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {isLoadingAiPoints ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Regénérer via Gemini IA</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Taste Twins & Direct Domain Line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span className="tabular-nums">
              Validé par {item.twinCount} Jumeaux à {item.twinMatchPercent} %
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{item.creator}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-500 dark:text-slate-400">{linkInfo.domain}</span>
        </div>
      </div>

      {/* Action Footer: Direct External Link + Audio Modal + Save + Mute */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Primary Direct Link Button */}
          <a
            href={linkInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-2 transition-colors max-w-full"
          >
            <span>
              {verb} {linkInfo.platformLabel}
            </span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </a>

          {/* Quick Detail & Voice Reader Modal Button */}
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            aria-label={`Aperçu et audio pour ${item.title}`}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Audio</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Save to Watchlist */}
          <button
            type="button"
            onClick={() => onToggleSave(item.id)}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? `Retirer "${item.title}" de Ma Liste`
                : `Sauvegarder "${item.title}" dans Ma Liste`
            }
            className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

          {/* Quick Universal Mute Button */}
          {onMuteKeyword && (
            <button
              type="button"
              onClick={() => onMuteKeyword(item.creator, '24h')}
              title={`Mettre en sourdine "${item.creator}" (24h)`}
              aria-label={`Mettre en sourdine ${item.creator} pendant 24h`}
              className="min-h-[42px] min-w-[42px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
