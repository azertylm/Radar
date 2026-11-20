import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Compass,
  Headphones,
  Moon,
  Radio,
  Search,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { AgendaTab } from './components/AgendaTab';
import { CatchupTab } from './components/CatchupTab';
import { ContentDetailModal } from './components/ContentDetailModal';
import { OnboardingModal } from './components/OnboardingModal';
import { RadarHomeTab } from './components/RadarHomeTab';
import { WatchlistProfileTab } from './components/WatchlistProfileTab';
import {
  INITIAL_AGENDA_EVENTS,
  INITIAL_RADAR_ITEMS,
  INITIAL_TRUST_CIRCLE,
} from './data/mockRadarData';
import {
  ContentFormat,
  FeedSourceMode,
  FomoUrgency,
  InterestCategory,
  MoodFilter,
  RadarContentItem,
  TrustCircleMember,
} from './types/radar';
import { filterAndRankFeed } from './utils/radarEngine';

type ActiveTab = 'radar' | 'catchup' | 'agenda' | 'watchlist';

const STORAGE_KEY = 'radar_anti_fomo_state_v1';
const THEME_STORAGE_KEY = 'radar_theme_mode_v1';

interface StoredRadarState {
  hasCompletedOnboarding: boolean;
  interests: InterestCategory[];
  platforms: ContentFormat[];
  outOfBubblePercent: number;
  watchlistIds: string[];
  remindedEventIds: string[];
  trustCircle: TrustCircleMember[];
}

const DEFAULT_STATE: StoredRadarState = {
  hasCompletedOnboarding: false,
  interests: ['Tech/IA', 'Cinéma', 'Actualités', 'Humour', 'Culture'],
  platforms: ['TV/Replay', 'YouTube', 'Podcasts', 'Réseaux sociaux', 'Streaming', 'Presse'],
  outOfBubblePercent: 15,
  watchlistIds: ['item-2', 'item-4', 'item-12'],
  remindedEventIds: ['ag-1'],
  trustCircle: INITIAL_TRUST_CIRCLE,
};

export default function App() {
  // Theme state (Light / Dark Onyx)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved ? saved === 'dark' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  // Persistent App State
  const [appState, setAppState] = useState<StoredRadarState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // ignore storage errors
    }
  }, [appState]);

  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<ActiveTab>('radar');
  const [items, setItems] = useState<RadarContentItem[]>(INITIAL_RADAR_ITEMS);
  const [selectedDetailItem, setSelectedDetailItem] = useState<RadarContentItem | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Feed Filter States
  const [sourceMode, setSourceMode] = useState<FeedSourceMode>('for_you');
  const [urgencyFilter, setUrgencyFilter] = useState<FomoUrgency | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<ContentFormat | 'all'>('all');
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handlers
  const handleToggleInterest = (category: InterestCategory) => {
    setAppState((prev) => {
      const exists = prev.interests.includes(category);
      if (exists && prev.interests.length <= 1) return prev; // keep at least 1
      const next = exists
        ? prev.interests.filter((c) => c !== category)
        : [...prev.interests, category];
      return { ...prev, interests: next };
    });
  };

  const handleTogglePlatform = (platform: ContentFormat) => {
    setAppState((prev) => {
      const exists = prev.platforms.includes(platform);
      if (exists && prev.platforms.length <= 1) return prev;
      const next = exists
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms: next };
    });
  };

  const handleToggleSaveWatchlist = (itemId: string) => {
    setAppState((prev) => {
      const exists = prev.watchlistIds.includes(itemId);
      const next = exists
        ? prev.watchlistIds.filter((id) => id !== itemId)
        : [itemId, ...prev.watchlistIds];
      return { ...prev, watchlistIds: next };
    });
  };

  const handleToggleReminder = (eventId: string) => {
    setAppState((prev) => {
      const exists = prev.remindedEventIds.includes(eventId);
      const next = exists
        ? prev.remindedEventIds.filter((id) => id !== eventId)
        : [...prev.remindedEventIds, eventId];
      return { ...prev, remindedEventIds: next };
    });
  };

  const handleToggleCircleMember = (memberId: string) => {
    setAppState((prev) => ({
      ...prev,
      trustCircle: prev.trustCircle.map((m) =>
        m.id === memberId ? { ...m, inCircle: !m.inCircle } : m
      ),
    }));
  };

  const handleAddCustomCircleMember = (
    name: string,
    role: 'Ami' | 'Créateur' | 'Journaliste',
    specialty: InterestCategory
  ) => {
    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const newId = `circle-custom-${Date.now()}`;
    const newMember: TrustCircleMember = {
      id: newId,
      name,
      handle: `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      role,
      specialty,
      avatarInitials: initials || 'AC',
      inCircle: true,
      recentPickTitle: `Recommandation ${specialty} partagée avec votre Cercle`,
    };

    // Also attach this new circle member to top matching category items so their picks show up immediately
    setItems((prevItems) =>
      prevItems.map((it) =>
        it.category === specialty
          ? { ...it, recommendedByCircleIds: [...it.recommendedByCircleIds, newId] }
          : it
      )
    );

    setAppState((prev) => ({
      ...prev,
      trustCircle: [newMember, ...prev.trustCircle],
    }));
  };

  const handleAddAiGems = (newGems: RadarContentItem[]) => {
    setItems((prev) => [...newGems, ...prev]);
  };

  const activeCircleIds = useMemo(
    () => appState.trustCircle.filter((m) => m.inCircle).map((m) => m.id),
    [appState.trustCircle]
  );

  const filteredFeed = useMemo(
    () =>
      filterAndRankFeed(items, {
        interests: appState.interests,
        platforms: appState.platforms,
        sourceMode,
        circleMemberIds: activeCircleIds,
        urgencyFilter,
        formatFilter,
        moodFilter,
        outOfBubblePercent: appState.outOfBubblePercent,
        searchQuery,
      }),
    [
      items,
      appState.interests,
      appState.platforms,
      sourceMode,
      activeCircleIds,
      urgencyFilter,
      formatFilter,
      moodFilter,
      appState.outOfBubblePercent,
      searchQuery,
    ]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0D13] text-slate-900 dark:text-slate-100 pb-20 md:pb-12">
      {/* TOP BAR CONTRACT: 1-row, 3-zone header (Brand wordmark | 4 nav links | 1 primary action) */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#0E1118]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#radar"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('radar');
          }}
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
        >
          Radar
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'radar'
                ? 'text-slate-900 dark:text-white border-amber-500 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Radar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catchup')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'catchup'
                ? 'text-slate-900 dark:text-white border-amber-500 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Rattrapage
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'agenda'
                ? 'text-slate-900 dark:text-white border-amber-500 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Agenda
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeTab === 'watchlist'
                ? 'text-slate-900 dark:text-white border-amber-500 font-semibold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ma Liste ({appState.watchlistIds.length})
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Fast Light / Dark Onyx Theme Toggle) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre Onyx'}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Thème Clair</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span>Thème Onyx</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (1440px responsive workspace) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Contextual Onboarding & Search Strip */}
        <div className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Compass className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Vos goûts actifs :
            </span>
            <span>{appState.interests.join(' · ')}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Personnaliser mes goûts & plateformes</span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'radar') setActiveTab('radar');
              }}
              aria-label="Rechercher un sujet, une chaîne, un podcast ou un créateur"
              placeholder="Filtrer par titre, média, créateur..."
              className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ACTIVE TAB VIEWPORT */}
        {activeTab === 'radar' && (
          <RadarHomeTab
            allItems={items}
            filteredFeed={filteredFeed}
            interests={appState.interests}
            platforms={appState.platforms}
            sourceMode={sourceMode}
            onChangeSourceMode={setSourceMode}
            urgencyFilter={urgencyFilter}
            onChangeUrgencyFilter={setUrgencyFilter}
            formatFilter={formatFilter}
            onChangeFormatFilter={setFormatFilter}
            moodFilter={moodFilter}
            onChangeMoodFilter={setMoodFilter}
            outOfBubblePercent={appState.outOfBubblePercent}
            onChangeOutOfBubblePercent={(val) =>
              setAppState((prev) => ({ ...prev, outOfBubblePercent: val }))
            }
            watchlistIds={appState.watchlistIds}
            onToggleSave={handleToggleSaveWatchlist}
            onOpenDetail={setSelectedDetailItem}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onAddAiGems={handleAddAiGems}
            trustCircle={appState.trustCircle}
          />
        )}

        {activeTab === 'catchup' && (
          <CatchupTab
            allItems={items}
            interests={appState.interests}
            platforms={appState.platforms}
            watchlistIds={appState.watchlistIds}
            onToggleSave={handleToggleSaveWatchlist}
            onOpenDetail={setSelectedDetailItem}
          />
        )}

        {activeTab === 'agenda' && (
          <AgendaTab
            events={INITIAL_AGENDA_EVENTS}
            remindedEventIds={appState.remindedEventIds}
            onToggleReminder={handleToggleReminder}
          />
        )}

        {activeTab === 'watchlist' && (
          <WatchlistProfileTab
            allItems={items}
            watchlistIds={appState.watchlistIds}
            onToggleSave={handleToggleSaveWatchlist}
            onOpenDetail={setSelectedDetailItem}
            interests={appState.interests}
            platforms={appState.platforms}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            trustCircle={appState.trustCircle}
            onToggleCircleMember={handleToggleCircleMember}
            onAddCustomCircleMember={handleAddCustomCircleMember}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (4 Primary Tabs, Touch-first 44px+ hitboxes) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0E1118]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('radar')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'radar'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span>Radar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catchup')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'catchup'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Headphones className="w-5 h-5" />
          <span>Rattrapage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'agenda'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'watchlist'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span>Ma Liste ({appState.watchlistIds.length})</span>
        </button>
      </nav>

      {/* ONBOARDING MODAL (Calibration des goûts sans compte) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        interests={appState.interests}
        platforms={appState.platforms}
        onToggleInterest={handleToggleInterest}
        onTogglePlatform={handleTogglePlatform}
        onComplete={() => {
          setAppState((prev) => ({ ...prev, hasCompletedOnboarding: true }));
          setIsOnboardingOpen(false);
        }}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* CONTENT DETAIL & VOICE SUMMARY MODAL */}
      <ContentDetailModal
        item={selectedDetailItem}
        isSaved={selectedDetailItem ? appState.watchlistIds.includes(selectedDetailItem.id) : false}
        onToggleSave={handleToggleSaveWatchlist}
        onClose={() => setSelectedDetailItem(null)}
      />
    </div>
  );
}
