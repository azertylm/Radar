import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  Flame,
  Gem,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Tv,
  Users,
  Zap,
} from 'lucide-react';
import { ALL_PLATFORMS } from '../data/mockRadarData';
import {
  ContentFormat,
  FeedSourceMode,
  FomoUrgency,
  InterestCategory,
  MoodFilter,
  MuteDuration,
  RadarContentItem,
  SubscriptionId,
  TrustCircleMember,
} from '../types/radar';
import { getDirectPlatformLink } from '../utils/radarEngine';
import { ContentCard, getUrgencyMeta } from './ContentCard';

interface RadarHomeTabProps {
  allItems: RadarContentItem[];
  filteredFeed: RadarContentItem[];
  interests: InterestCategory[];
  platforms: ContentFormat[];
  ownedSubscriptions: SubscriptionId[];
  onlyAccessibleNow: boolean;
  onToggleOnlyAccessibleNow: () => void;
  disconnectMode: boolean;
  onSwitchToCatchupMagazine: () => void;
  sourceMode: FeedSourceMode;
  onChangeSourceMode: (mode: FeedSourceMode) => void;
  urgencyFilter: FomoUrgency | 'all';
  onChangeUrgencyFilter: (u: FomoUrgency | 'all') => void;
  formatFilter: ContentFormat | 'all';
  onChangeFormatFilter: (f: ContentFormat | 'all') => void;
  moodFilter: MoodFilter;
  onChangeMoodFilter: (m: MoodFilter) => void;
  outOfBubblePercent: number;
  onChangeOutOfBubblePercent: (val: number) => void;
  watchlistIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
  onOpenOnboarding: () => void;
  onAddAiGems: (newGems: RadarContentItem[]) => void;
  onMuteKeyword: (keyword: string, duration: MuteDuration) => void;
  onMarkSpoilerSeen: (keyword: string) => void;
  trustCircle: TrustCircleMember[];
}

const MOOD_OPTIONS: Array<{ id: MoodFilter; label: string }> = [
  { id: 'all', label: 'Toutes les humeurs' },
  { id: 'laugh', label: 'Envie de rire' },
  { id: 'learn', label: "Envie d'apprendre" },
  { id: 'background', label: 'Bruit de fond' },
  { id: 'serious', label: 'Actu sérieuse' },
];

const URGENCY_OPTIONS: Array<{ id: FomoUrgency | 'all'; label: string; dotClass?: string }> = [
  { id: 'all', label: 'Tout voir' },
  { id: 'live', label: 'En direct', dotClass: 'bg-rose-600' },
  { id: 'expiring', label: 'Expire bientôt', dotClass: 'bg-amber-500' },
  { id: 'anytime', label: 'Quand tu veux', dotClass: 'bg-emerald-600' },
];

export const RadarHomeTab: React.FC<RadarHomeTabProps> = ({
  allItems,
  filteredFeed,
  interests,
  platforms,
  ownedSubscriptions,
  onlyAccessibleNow,
  onToggleOnlyAccessibleNow,
  disconnectMode,
  onSwitchToCatchupMagazine,
  sourceMode,
  onChangeSourceMode,
  urgencyFilter,
  onChangeUrgencyFilter,
  formatFilter,
  onChangeFormatFilter,
  moodFilter,
  onChangeMoodFilter,
  outOfBubblePercent,
  onChangeOutOfBubblePercent,
  watchlistIds,
  onToggleSave,
  onOpenDetail,
  onAddAiGems,
  onMuteKeyword,
  onMarkSpoilerSeen,
  trustCircle,
}) => {
  const [activeBuzzIndex, setActiveBuzzIndex] = useState(0);
  const [isSuggestingAi, setIsSuggestingAi] = useState(false);
  const [aiStatusBanner, setAiStatusBanner] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const buzzItems = allItems.filter((item) => item.isBuzzPeak);
  const activeBuzz = buzzItems[activeBuzzIndex] || buzzItems[0];
  const buzzLink = activeBuzz
    ? getDirectPlatformLink({
        ...activeBuzz,
        highlightSeconds: activeBuzz.highlightMoment?.seconds,
      })
    : null;

  const activeCircleCount = trustCircle.filter((m) => m.inCircle).length;
  const hiddenGemsCount = allItems.filter((i) => i.isHiddenGem).length;
  const outOfBubbleCount = filteredFeed.filter((i) => i.isOutOfBubble).length;

  const handleSuggestGemsByAi = async () => {
    setIsSuggestingAi(true);
    setAiStatusBanner(null);
    try {
      const response = await fetch('/api/gemini/suggest-gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          platforms,
          mood: moodFilter,
          existingTitles: allItems.map((i) => i.title),
        }),
      });
      const data = await response.json();
      if (data.gems && Array.isArray(data.gems)) {
        const mapped: RadarContentItem[] = data.gems.map(
          (
            g: Partial<RadarContentItem> & {
              actionUrl?: string;
              highlightTimestamp?: string;
              highlightLabel?: string;
            },
            idx: number
          ) => ({
            id: `ai-gem-${Date.now()}-${idx}`,
            title: g.title || 'Pépite culturelle sélectionnée par IA',
            source: g.source || 'Arte.tv',
            creator: g.creator || 'Sélection IA Radar',
            format: (g.format as ContentFormat) || 'TV/Replay',
            category: (g.category as InterestCategory) || interests[0] || 'Culture',
            durationMinutes: Number(g.durationMinutes) || 18,
            urgency: (g.urgency as FomoUrgency) || 'expiring',
            expiresInHours: Number(g.expiresInHours) || 12,
            mood: (g.mood as Exclude<MoodFilter, 'all'>) || 'learn',
            twinMatchPercent: Number(g.twinMatchPercent) || 95,
            twinCount: Number(g.twinCount) || 5,
            recommendedByCircleIds: ['circle-1', 'circle-2'],
            summary:
              g.summary ||
              'Pépite fraîchement détectée par votre Radar selon vos goûts et les signaux de vos Jumeaux.',
            threeBulletPoints:
              Array.isArray(g.threeBulletPoints) && g.threeBulletPoints.length >= 3
                ? [g.threeBulletPoints[0], g.threeBulletPoints[1], g.threeBulletPoints[2]]
                : [
                    'Sélectionné sur mesure selon vos thématiques actives.',
                    'Fort taux de recommandation chez vos Jumeaux de goûts.',
                    'Accessible immédiatement en un clic.',
                  ],
            highlightMoment: g.highlightTimestamp
              ? {
                  timestamp: g.highlightTimestamp,
                  seconds: 1180,
                  label: g.highlightLabel || 'Le passage clé plébiscité',
                }
              : undefined,
            isFree: true,
            subscriptionId: 'free',
            keyTakeaway: 'Nouvelle pépite générée sur mesure pour votre flux Radar.',
            publishedAt: "Détecté à l'instant par IA",
            externalUrl: g.actionUrl,
          })
        );
        onAddAiGems(mapped);
        setAiStatusBanner(
          `${mapped.length} nouvelles pépites avec liens directs ajoutées en haut du flux.`
        );
      }
    } catch (err) {
      console.error('Failed to fetch AI gems:', err);
      setAiStatusBanner('Impossible de contacter le moteur IA pour le moment.');
    } finally {
      setIsSuggestingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. LE RADAR DE BUZZ EN TEMPS RÉEL (ou Bandeau Mode Déconnexion si activé) */}
      {disconnectMode ? (
        <section className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-emerald-400 mb-1">
              Mode Déconnexion actif · Alertes et pics de buzz en pause
            </div>
            <p className="text-sm text-slate-300">
              Vous naviguez sans notifications urgentes. Consultez votre Édition Magazine des 5 vraies pépites dans l’onglet Rattrapage.
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToCatchupMagazine}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ouvrir le Journal du Dimanche
          </button>
        </section>
      ) : (
        activeBuzz &&
        buzzLink && (
          <section aria-labelledby="radar-buzz-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="radar-buzz-heading"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
              >
                <Flame className="w-5 h-5 text-amber-500" aria-hidden="true" />
                <span>Radar de Buzz · À ne pas louper maintenant</span>
              </h2>

              <div className="flex items-center gap-1.5" role="tablist" aria-label="Pics de buzz actifs">
                {buzzItems.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeBuzzIndex}
                    onClick={() => setActiveBuzzIndex(idx)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      idx === activeBuzzIndex
                        ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                        : 'bg-slate-200/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {idx + 1}. {b.category}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured Buzz Card */}
            <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-[260px] bg-slate-800 overflow-hidden">
                {activeBuzz.imageUrl && !failedImages[activeBuzz.id] ? (
                  <img
                    src={activeBuzz.imageUrl}
                    alt={activeBuzz.title}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({ ...prev, [activeBuzz.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-400">
                    <Flame className="w-10 h-10 text-amber-400 mb-2" />
                    <span className="text-xs font-medium text-center">{activeBuzz.source}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-xs font-semibold text-amber-400">
                  {activeBuzz.buzzReason}
                </div>
              </div>

              <div className="lg:col-span-7 p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-400">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeBuzz.urgency === 'live'
                            ? 'bg-rose-500 animate-ping'
                            : 'bg-amber-400'
                        }`}
                      />
                      <span>
                        {getUrgencyMeta(activeBuzz.urgency, activeBuzz.expiresInHours).label}
                      </span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-white">{activeBuzz.category}</span>
                    <span aria-hidden="true">·</span>
                    <a
                      href={buzzLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{activeBuzz.source}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums inline-flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5" />
                      {activeBuzz.durationMinutes} min
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                    <a
                      href={buzzLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-400 transition-colors"
                    >
                      {activeBuzz.title}
                    </a>
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeBuzz.summary}
                  </p>

                  {activeBuzz.highlightMoment && (
                    <div>
                      <a
                        href={buzzLink.highlightUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 rounded-lg px-3 py-1 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono tabular-nums">
                          Moment fort : {activeBuzz.highlightMoment.timestamp}
                        </span>
                        <span>– {activeBuzz.highlightMoment.label}</span>
                      </a>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span className="tabular-nums text-slate-200 font-medium">
                      Validé par {activeBuzz.twinCount} Jumeaux à {activeBuzz.twinMatchPercent} %
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-amber-300/90">{buzzLink.domain}</span>
                  </div>
                </div>

                {/* Buzz Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-800">
                  <a
                    href={buzzLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Ouvrir sur {buzzLink.platformLabel}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenDetail(activeBuzz)}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Résumé & Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSave(activeBuzz.id)}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      watchlistIds.includes(activeBuzz.id)
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'border-slate-700 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    {watchlistIds.includes(activeBuzz.id) ? (
                      <>
                        <Check className="w-4 h-4 text-amber-400" />
                        <span>Sauvegardé</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-4 h-4" />
                        <span>Sauvegarder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )
      )}

      {/* 2. CONTROL DECK: 4 SOURCES (Pour toi / Jumeaux / Cercle / Pépites cachées), ACCESSIBLE NOW, URGENCY & MOOD/HORS-BULLE */}
      <section
        aria-label="Filtres intelligents du flux"
        className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-4 space-y-4"
      >
        {/* Row 1: 4 Source Tabs + Accessible Tout de Suite Toggle + IA Gems */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* 4-Source Selector */}
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800"
            role="group"
            aria-label="Sélecteur de source du flux"
          >
            <button
              type="button"
              onClick={() => onChangeSourceMode('for_you')}
              aria-pressed={sourceMode === 'for_you'}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceMode === 'for_you'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pour toi
            </button>
            <button
              type="button"
              onClick={() => onChangeSourceMode('taste_twins')}
              aria-pressed={sourceMode === 'taste_twins'}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceMode === 'taste_twins'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Jumeaux de goûts
            </button>
            <button
              type="button"
              onClick={() => onChangeSourceMode('trust_circle')}
              aria-pressed={sourceMode === 'trust_circle'}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceMode === 'trust_circle'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Cercle de confiance ({activeCircleCount})
            </button>
            <button
              type="button"
              onClick={() => onChangeSourceMode('hidden_gems')}
              aria-pressed={sourceMode === 'hidden_gems'}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sourceMode === 'hidden_gems'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <Gem className="w-3.5 h-3.5" />
              <span>Pépites cachées ({hiddenGemsCount})</span>
            </button>
          </div>

          {/* Right tools: Accessible tout de suite + Humeur/Hors-bulle + IA */}
          <div className="flex flex-wrap items-center gap-2">
            {/* MODULE 6: Filtre "Accessible tout de suite" */}
            <button
              type="button"
              onClick={onToggleOnlyAccessibleNow}
              aria-pressed={onlyAccessibleNow}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyAccessibleNow
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Accessible tout de suite ({ownedSubscriptions.length} accès)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMoreFilters((prev) => !prev)}
              aria-expanded={showMoreFilters}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showMoreFilters || moodFilter !== 'all' || formatFilter !== 'all'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Hors-bulle ({outOfBubblePercent} %) & Support</span>
            </button>

            <button
              type="button"
              onClick={handleSuggestGemsByAi}
              disabled={isSuggestingAi}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSuggestingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>+ Pépites IA</span>
            </button>
          </div>
        </div>

        {/* Row 2: FOMO Urgency Quick Filter + Mood Quick Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Urgency Filter */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer par urgence FOMO">
            {URGENCY_OPTIONS.map((u) => {
              const active = urgencyFilter === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onChangeUrgencyFilter(u.id)}
                  aria-pressed={active}
                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {u.dotClass && (
                    <span className={`w-2 h-2 rounded-full ${u.dotClass}`} aria-hidden="true" />
                  )}
                  <span>{u.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mood Buttons always visible for 1-click mood shift */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer par humeur">
            {MOOD_OPTIONS.map((mood) => {
              const active = moodFilter === mood.id;
              return (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => onChangeMoodFilter(mood.id)}
                  aria-pressed={active}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  {mood.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Row 3: Curseur Hors de ma bulle (0% to 50%) + Format select */}
        {showMoreFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="out-of-bubble-slider"
                  className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>Curseur « Hors de ma bulle » (0 % à 50 %)</span>
                </label>
                <span className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {outOfBubblePercent} % ({outOfBubbleCount} découverte{outOfBubbleCount > 1 ? 's' : ''} injectée{outOfBubbleCount > 1 ? 's' : ''})
                </span>
              </div>
              <input
                id="out-of-bubble-slider"
                type="range"
                min={0}
                max={50}
                step={5}
                value={outOfBubblePercent}
                onChange={(e) => onChangeOutOfBubblePercent(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 rounded-lg"
              />
            </div>

            <div className="lg:col-span-4">
              <label
                htmlFor="format-filter-select"
                className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                Filtrer par support
              </label>
              <select
                id="format-filter-select"
                value={formatFilter}
                onChange={(e) => onChangeFormatFilter(e.target.value as ContentFormat | 'all')}
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tous les supports ({allItems.length})</option>
                {ALL_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* AI Suggestion feedback banner */}
      {aiStatusBanner && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{aiStatusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiStatusBanner(null)}
            className="underline hover:no-underline text-xs cursor-pointer"
          >
            Masquer
          </button>
        </div>
      )}

      {/* 3. INTELLIGENT FEED GRID */}
      <section aria-labelledby="feed-results-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2
            id="feed-results-heading"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Votre flux direct ({filteredFeed.length} contenus)
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Accès direct aux liens · Résumé 3 points en 10s · Saut aux moments forts
          </span>
        </div>

        {filteredFeed.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Aucun contenu pour ce filtre
            </p>
            <button
              type="button"
              onClick={() => {
                onChangeUrgencyFilter('all');
                onChangeFormatFilter('all');
                onChangeMoodFilter('all');
                onChangeSourceMode('for_you');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Afficher tous les contenus
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeed.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                isSaved={watchlistIds.includes(item.id)}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
                onMuteKeyword={onMuteKeyword}
                onMarkSpoilerSeen={onMarkSpoilerSeen}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
