import React, { useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  GitBranch,
  Plus,
  Radio,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { ALL_INTERESTS, INITIAL_FILS_ROUGES } from '../data/mockRadarData';
import {
  InterestCategory,
  MoodFilter,
  MuteRule,
  RadarContentItem,
  SubscriptionId,
  SurpriseGuestProfile,
} from '../types/radar';
import { buildPartyModeSelection, getDirectPlatformLink } from '../utils/radarEngine';
import { ContentCard, getFormatIcon } from './ContentCard';

interface ExplorerTabProps {
  allItems: RadarContentItem[];
  userInterests: InterestCategory[];
  ownedSubscriptions: SubscriptionId[];
  onlyAccessibleNow: boolean;
  muteRules: MuteRule[];
  surpriseGuests: SurpriseGuestProfile[];
  onToggleFollowGuest: (guestId: string) => void;
  onAddCustomGuest: (name: string, specialty: InterestCategory) => void;
  watchlistIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
}

export const ExplorerTab: React.FC<ExplorerTabProps> = ({
  allItems,
  userInterests,
  ownedSubscriptions,
  onlyAccessibleNow,
  muteRules,
  surpriseGuests,
  onToggleFollowGuest,
  onAddCustomGuest,
  watchlistIds,
  onToggleSave,
  onOpenDetail,
}) => {
  // Sub-section selector or show all 3 modules cleanly
  const [activeFilRougeId, setActiveFilRougeId] = useState<string>(INITIAL_FILS_ROUGES[0].id);

  // Module 9: Add custom personality to "Invité Surprise"
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestSpecialty, setNewGuestSpecialty] = useState<InterestCategory>('Cinéma');

  // Module 11: "Mode Soirée à plusieurs" state
  const [friendName, setFriendName] = useState('Alex');
  const [guestInterests, setGuestInterests] = useState<InterestCategory[]>([
    'Humour',
    'Cinéma',
    'Musique',
  ]);
  const [partyMood, setPartyMood] = useState<MoodFilter>('all');

  const activeFilRouge =
    INITIAL_FILS_ROUGES.find((f) => f.id === activeFilRougeId) || INITIAL_FILS_ROUGES[0];

  const followedGuests = surpriseGuests.filter((g) => g.followed);

  const partyMatch = buildPartyModeSelection(
    allItems,
    userInterests,
    guestInterests,
    partyMood,
    onlyAccessibleNow,
    ownedSubscriptions,
    muteRules
  );

  const handleAddGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;
    onAddCustomGuest(newGuestName.trim(), newGuestSpecialty);
    setNewGuestName('');
  };

  const handleToggleGuestInterest = (cat: InterestCategory) => {
    setGuestInterests((prev) => {
      if (prev.includes(cat)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      if (prev.length >= 4) return [...prev.slice(1), cat];
      return [...prev, cat];
    });
  };

  return (
    <div className="space-y-10">
      {/* MODULE 9: L'ALERTE « INVITÉ SURPRISE » */}
      <section
        aria-labelledby="surprise-guest-heading"
        className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Radar de personnalités · Apparitions hors des radars habituels</span>
            </div>
            <h2
              id="surprise-guest-heading"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              L’Alerte « Invité Surprise » ({followedGuests.length} personnalités suivies)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Ne ratez plus jamais le passage d’un artiste, chercheur ou sportif que vous aimez sur un podcast indépendant, une chaîne YouTube secondaire ou un live Twitch.
            </p>
          </div>

          {/* Add Personality Free Input Bar */}
          <form onSubmit={handleAddGuestSubmit} className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              placeholder="Ajouter une personnalité (ex: Thomas Pesquet)..."
              aria-label="Nom de la personnalité à suivre"
              className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white w-full sm:w-64"
            />
            <select
              aria-label="Domaine de la personnalité"
              value={newGuestSpecialty}
              onChange={(e) => setNewGuestSpecialty(e.target.value as InterestCategory)}
              className="min-h-[42px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              {ALL_INTERESTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-[42px] px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Suivre</span>
            </button>
          </form>
        </div>

        {/* Followed Personalities Pills / Toggles */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {surpriseGuests.map((guest) => (
            <button
              key={guest.id}
              type="button"
              onClick={() => onToggleFollowGuest(guest.id)}
              aria-pressed={guest.followed}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                guest.followed
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-300'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {guest.followed ? (
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span>{guest.name}</span>
              <span className="text-[11px] opacity-75">· {guest.specialty}</span>
            </button>
          ))}
        </div>

        {/* Unexpected Appearances Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {followedGuests.flatMap((guest) =>
            guest.appearances.map((app) => {
              const FormatIcon = getFormatIcon(app.format);
              const linkInfo = getDirectPlatformLink({
                title: `${guest.name} ${app.showTitle}`,
                source: app.hostMedia,
                format: app.format,
                externalUrl: app.externalUrl,
              });

              return (
                <div
                  key={app.id}
                  className="p-5 rounded-xl bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        Invité surprise : {guest.name}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {app.dateLabel} · {app.durationMinutes} min
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      <a
                        href={linkInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                      >
                        {app.showTitle}
                      </a>
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {app.unexpectedReason}
                    </p>

                    {app.highlightTimestamp && (
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 pt-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Passage clé : {app.highlightTimestamp}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 min-w-0">
                      <FormatIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{app.hostMedia}</span>
                    </span>

                    <a
                      href={linkInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <span>Ouvrir sur {linkInfo.platformLabel}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* MODULE 10: LE « FIL ROUGE » (Frise chronologique multi-médias) */}
      <section
        aria-labelledby="fil-rouge-heading"
        className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" />
              <span>Dossiers thématiques en cours · Frise chronologique multi-supports</span>
            </div>
            <h2
              id="fil-rouge-heading"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Le « Fil Rouge » : Suivez un événement de A à Z
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Articles de cadrage, vidéos, réactions sociales et podcasts de débrief réunis sur une seule ligne du temps.
            </p>
          </div>

          {/* Storyline Selector */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Dossiers Fil Rouge">
            {INITIAL_FILS_ROUGES.map((fil) => {
              const active = fil.id === activeFilRouge.id;
              return (
                <button
                  key={fil.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveFilRougeId(fil.id)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {fil.category} · {fil.title.split(':')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Fil Rouge Header */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {activeFilRouge.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {activeFilRouge.subtitle}
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold shrink-0">
            Suivi par {activeFilRouge.activeFollowers.toLocaleString('fr-FR')} Jumeaux
          </span>
        </div>

        {/* Chronological Timeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeFilRouge.steps.map((step, index) => {
            const StepIcon = getFormatIcon(step.mediaType);
            const linkInfo = getDirectPlatformLink({
              title: step.title,
              source: step.source,
              format: step.mediaType,
              externalUrl: step.externalUrl,
            });

            return (
              <div
                key={step.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      0{index + 1}. {step.timeLabel}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {step.durationMinutes} min
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                    <StepIcon className="w-3.5 h-3.5" />
                    <span>{step.source}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    <a
                      href={linkInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-600 dark:hover:text-amber-400"
                    >
                      {step.title}
                    </a>
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.summary}
                  </p>
                </div>

                <a
                  href={linkInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold inline-flex items-center justify-between transition-colors"
                >
                  <span>Ouvrir ({linkInfo.platformLabel})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* MODULE 11: LE « MODE SOIRÉE À PLUSIEURS » */}
      <section
        aria-labelledby="party-mode-heading"
        className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Match de profils · Fini les 40 minutes à chercher quoi regarder à deux</span>
            </div>
            <h2
              id="party-mode-heading"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Le « Mode Soirée à plusieurs » (Vous + {friendName || 'Invité'})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Croisez vos goûts ({userInterests.slice(0, 3).join(', ')}) avec 2 ou 3 envies de votre invité pour générer une sélection qui met tout le monde d’accord.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-mono font-bold tabular-nums shrink-0">
            Compatibilité du duo : {partyMatch.overallDuoCompatibility} %
          </div>
        </div>

        {/* Duo Configurator */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-3">
            <label
              htmlFor="friend-name-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Prénom de l’ami(e) / invité(e)
            </label>
            <input
              id="friend-name-input"
              type="text"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div className="lg:col-span-6">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Les envies de {friendName || 'votre invité'} ce soir ({guestInterests.length} choisies)
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {ALL_INTERESTS.map((cat) => {
                const selected = guestInterests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleGuestInterest(cat.id)}
                    aria-pressed={selected}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {cat.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="party-mood-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Ambiance de la soirée
            </label>
            <select
              id="party-mood-select"
              value={partyMood}
              onChange={(e) => setPartyMood(e.target.value as MoodFilter)}
              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">Toutes les ambiances</option>
              <option value="laugh">Envie de rire ensemble</option>
              <option value="learn">Découverte & Documentaire</option>
              <option value="background">Musique & Ambiance</option>
              <option value="serious">Grand Cinéma & Enquête</option>
            </select>
          </div>
        </div>

        {/* Consensus Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partyMatch.recommendations.map((rec) => (
            <div key={rec.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{rec.sharedReason}</span>
                </span>
                <span className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  Match Duo : {rec.duoCompatibility} %
                </span>
              </div>
              <ContentCard
                item={rec}
                isSaved={watchlistIds.includes(rec.id)}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
