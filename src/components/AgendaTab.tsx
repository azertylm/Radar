import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  Clock,
  ExternalLink,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  AgendaDayGroup,
  AgendaEvent,
  ContentFormat,
  InterestCategory,
  SpoilerRule,
} from '../types/radar';
import { getDirectPlatformLink } from '../utils/radarEngine';
import { getFormatIcon } from './ContentCard';

interface AgendaTabProps {
  events: AgendaEvent[];
  remindedEventIds: string[];
  onToggleReminder: (eventId: string) => void;
  spoilerRules: SpoilerRule[];
  onToggleEventSpoiler: (spoilerTag: string, category: InterestCategory) => void;
}

const DAY_TABS: Array<{ id: AgendaDayGroup | 'all'; label: string }> = [
  { id: 'all', label: 'Tout l’agenda' },
  { id: 'today', label: "Aujourd'hui" },
  { id: 'tomorrow', label: 'Demain' },
  { id: 'week', label: 'Cette semaine' },
];

export const AgendaTab: React.FC<AgendaTabProps> = ({
  events,
  remindedEventIds,
  onToggleReminder,
  spoilerRules,
  onToggleEventSpoiler,
}) => {
  const [selectedDay, setSelectedDay] = useState<AgendaDayGroup | 'all'>('all');
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat | 'all'>('all');

  const filteredEvents = events.filter((ev) => {
    if (selectedDay !== 'all' && ev.dayGroup !== selectedDay) return false;
    if (selectedFormat !== 'all' && ev.format !== selectedFormat) return false;
    return true;
  });

  const activeSpoilerCount = spoilerRules.filter((r) => !r.seen).length;

  const groups: Array<{ key: AgendaDayGroup; title: string; subtitle: string }> = [
    {
      key: 'today',
      title: "Aujourd'hui",
      subtitle: 'Directs du soir, grands matchs TV et tables rondes live',
    },
    {
      key: 'tomorrow',
      title: 'Demain',
      subtitle: 'Sorties séries dès l’aube, nouveaux épisodes podcasts et concerts',
    },
    {
      key: 'week',
      title: 'Cette semaine',
      subtitle: 'Showcases, festivals en streaming et grands débats',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Chronological Filters */}
      <section className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>L’Agenda universel des directs & sorties</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Accédez directement aux plateformes de diffusion, programmez un rappel 15 min avant ou activez le Bouclier Anti-Spoiler en 1 clic si vous regardez en différé.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums font-semibold">
            <span className="text-amber-700 dark:text-amber-400">
              {remindedEventIds.length} rappel{remindedEventIds.length > 1 ? 's' : ''} (-15 min)
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              |
            </span>
            <span className="text-indigo-700 dark:text-indigo-400">
              {activeSpoilerCount} bouclier{activeSpoilerCount > 1 ? 's' : ''} Anti-Spoiler actif{activeSpoilerCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Chronological Day Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer l'agenda par période">
            {DAY_TABS.map((tab) => {
              const active = selectedDay === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedDay(tab.id)}
                  aria-pressed={active}
                  className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Support / Format filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="agenda-format-select" className="text-xs text-slate-500 dark:text-slate-400">
              Support :
            </label>
            <select
              id="agenda-format-select"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as ContentFormat | 'all')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Tous les supports</option>
              <option value="TV/Replay">TV & Directs</option>
              <option value="YouTube">YouTube Live</option>
              <option value="Streaming">Streaming & Twitch</option>
              <option value="Podcasts">Podcasts & Radio</option>
              <option value="Presse">Presse Live</option>
            </select>
          </div>
        </div>
      </section>

      {/* Chronological Timeline Sections */}
      <div className="space-y-8">
        {groups
          .filter((g) => selectedDay === 'all' || selectedDay === g.key)
          .map((group) => {
            const groupEvents = filteredEvents.filter((e) => e.dayGroup === group.key);
            if (groupEvents.length === 0) return null;

            return (
              <section key={group.key} className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {group.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {group.subtitle}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {groupEvents.length} rendez-vous
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 overflow-hidden">
                  {groupEvents.map((ev) => {
                    const isReminded = remindedEventIds.includes(ev.id);
                    const isSpoilerProtected = spoilerRules.some(
                      (r) =>
                        !r.seen &&
                        r.keyword.toLowerCase().trim() === ev.spoilerTag.toLowerCase().trim()
                    );
                    const FormatIcon = getFormatIcon(ev.format);
                    const linkInfo = getDirectPlatformLink({
                      title: ev.title,
                      source: ev.platform,
                      format: ev.format,
                    });

                    return (
                      <div
                        key={ev.id}
                        className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="space-y-1.5 min-w-0">
                          {/* Unboxed metadata row */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-amber-400">
                              {ev.timeLabel}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {ev.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <a
                              href={linkInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 hover:underline"
                            >
                              <FormatIcon className="w-3.5 h-3.5" />
                              <span>{ev.platform}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {ev.isLiveBroadcast && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                                  <Radio className="w-3.5 h-3.5" />
                                  <span>Direct</span>
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            <a
                              href={linkInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                            >
                              {ev.title}
                            </a>
                          </h4>

                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {ev.subtitle}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Durée : {ev.durationMinutes} min</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Users className="w-3.5 h-3.5 text-amber-500" />
                              <span>Attendu par {ev.twinInterestCount} Jumeaux</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              Mot-clé bouclier : « {ev.spoilerTag} »
                            </span>
                          </div>
                        </div>

                        {/* Direct Link + Reminder + Anti-Spoiler Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <a
                            href={linkInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <span>Ouvrir {linkInfo.platformLabel}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => onToggleReminder(ev.id)}
                            aria-pressed={isReminded}
                            aria-label={
                              isReminded
                                ? `Rappel activé 15 min avant pour ${ev.title}`
                                : `Me rappeler 15 min avant pour ${ev.title}`
                            }
                            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isReminded
                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isReminded ? (
                              <>
                                <BellRing className="w-3.5 h-3.5" />
                                <span>Rappel (-15 min)</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3.5 h-3.5" />
                                <span>Me rappeler (15 min avant)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onToggleEventSpoiler(ev.spoilerTag, ev.category)}
                            aria-pressed={isSpoilerProtected}
                            aria-label={
                              isSpoilerProtected
                                ? `Désactiver l'Anti-Spoiler pour ${ev.spoilerTag}`
                                : `Activer l'Anti-Spoiler pour ${ev.spoilerTag}`
                            }
                            className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              isSpoilerProtected
                                ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500'
                            }`}
                          >
                            {isSpoilerProtected ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Anti-Spoiler actif</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Activer l’Anti-Spoiler</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
};
