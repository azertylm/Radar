import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  Compass,
  Headphones,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { AgendaTab } from './components/AgendaTab';
import { AlphabetteDoubleBar } from './components/AlphabetteDoubleBar';
import { CatchupTab } from './components/CatchupTab';
import { ContentDetailModal } from './components/ContentDetailModal';
import { ExplorerTab } from './components/ExplorerTab';
import { OnboardingModal } from './components/OnboardingModal';
import { RadarHomeTab } from './components/RadarHomeTab';
import { WatchlistProfileTab } from './components/WatchlistProfileTab';
import {
  INITIAL_AGENDA_EVENTS,
  INITIAL_MUTE_RULES,
  INITIAL_RADAR_ITEMS,
  INITIAL_SPOILER_RULES,
  INITIAL_SURPRISE_GUESTS,
  INITIAL_TRUST_CIRCLE,
} from './data/mockRadarData';
import {
  ContentFormat,
  FeedSourceMode,
  FomoUrgency,
  InterestCategory,
  MoodFilter,
  MuteDuration,
  MuteRule,
  RadarContentItem,
  SpoilerRule,
  SubscriptionId,
  SurpriseGuestProfile,
  TrustCircleMember,
} from './types/radar';
import { filterAndRankFeed } from './utils/radarEngine';

type ActiveTab = 'radar' | 'explorer' | 'catchup' | 'agenda' | 'watchlist';

const STORAGE_KEY = 'radar_anti_fomo_state_v2';
const THEME_STORAGE_KEY = 'radar_theme_mode_v1';
const BIG_MODE_STORAGE_KEY = 'radar_big_mode_v1';
const SIMPLE_MODE_STORAGE_KEY = 'radar_simple_mode_v1';

interface StoredRadarState {
  hasCompletedOnboarding: boolean;
  interests: InterestCategory[];
  platforms: ContentFormat[];
  ownedSubscriptions: SubscriptionId[];
  onlyAccessibleNow: boolean;
  disconnectMode: boolean;
  outOfBubblePercent: number;
  watchlistIds: string[];
  remindedEventIds: string[];
  trustCircle: TrustCircleMember[];
  spoilerRules: SpoilerRule[];
  muteRules: MuteRule[];
  surpriseGuests: SurpriseGuestProfile[];
}

const DEFAULT_STATE: StoredRadarState = {
  hasCompletedOnboarding: false,
  interests: ['Tech/IA', 'Cinéma', 'Actualités', 'Humour', 'Culture'],
  platforms: ['TV/Replay', 'YouTube', 'Podcasts', 'Réseaux sociaux', 'Streaming', 'Presse'],
  ownedSubscriptions: ['free', 'netflix', 'canal'],
  onlyAccessibleNow: false,
  disconnectMode: false,
  outOfBubblePercent: 15,
  watchlistIds: ['item-2', 'item-4', 'item-12'],
  remindedEventIds: ['ag-1'],
  trustCircle: INITIAL_TRUST_CIRCLE,
  spoilerRules: INITIAL_SPOILER_RULES,
  muteRules: INITIAL_MUTE_RULES,
  surpriseGuests: INITIAL_SURPRISE_GUESTS,
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

  // BIG Mode & Simple Mode state (isolated from Double Barre header)
  const [isBigMode, setIsBigMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BIG_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIMPLE_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BIG_MODE_STORAGE_KEY, String(isBigMode));
    } catch {
      // ignore
    }
  }, [isBigMode]);

  useEffect(() => {
    try {
      localStorage.setItem(SIMPLE_MODE_STORAGE_KEY, String(isSimpleMode));
    } catch {
      // ignore
    }
  }, [isSimpleMode]);

  // Navigation, Modal & Toast State
  const [activeTab, setActiveTab] = useState<ActiveTab>('radar');
  const [items, setItems] = useState<RadarContentItem[]>(INITIAL_RADAR_ITEMS);
  const [selectedDetailItem, setSelectedDetailItem] = useState<RadarContentItem | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleToggleBigMode = () => {
    setIsBigMode((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Mode BIG activé : texte agrandi sans débordement'
          : 'Mode BIG désactivé : taille standard'
      );
      return next;
    });
  };

  const handleToggleSimpleMode = () => {
    setIsSimpleMode((prev) => {
      const next = !prev;
      if (next && !isBigMode) {
        setIsBigMode(true);
      }
      showToast(
        next
          ? 'Mode simple activé : lecture apaisée et agrandie'
          : 'Mode simple désactivé'
      );
      return next;
    });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

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
      if (exists && prev.interests.length <= 1) return prev;
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

  const handleToggleSubscription = (subId: SubscriptionId) => {
    if (subId === 'free') return; // Gratuit is always owned
    setAppState((prev) => {
      const exists = prev.ownedSubscriptions.includes(subId);
      const next = exists
        ? prev.ownedSubscriptions.filter((id) => id !== subId)
        : [...prev.ownedSubscriptions, subId];
      return { ...prev, ownedSubscriptions: next };
    });
    showToast('Vos abonnements ont été mis à jour');
  };

  const handleToggleOnlyAccessibleNow = () => {
    setAppState((prev) => {
      const next = !prev.onlyAccessibleNow;
      showToast(
        next
          ? 'Filtre « Accessible tout de suite » activé'
          : 'Tous les contenus sont affichés'
      );
      return { ...prev, onlyAccessibleNow: next };
    });
  };

  const handleToggleDisconnectMode = () => {
    setAppState((prev) => {
      const next = !prev.disconnectMode;
      showToast(
        next
          ? 'Mode Déconnexion activé : Radar de Buzz mis en pause'
          : 'Mode Déconnexion désactivé : retour au flux temps réel'
      );
      return { ...prev, disconnectMode: next };
    });
  };

  const handleToggleSaveWatchlist = (itemId: string) => {
    setAppState((prev) => {
      const exists = prev.watchlistIds.includes(itemId);
      const next = exists
        ? prev.watchlistIds.filter((id) => id !== itemId)
        : [itemId, ...prev.watchlistIds];
      showToast(
        exists ? 'Retiré de votre Watchlist' : 'Ajouté à votre Watchlist anti-oubli'
      );
      return { ...prev, watchlistIds: next };
    });
  };

  const handleToggleReminder = (eventId: string) => {
    setAppState((prev) => {
      const exists = prev.remindedEventIds.includes(eventId);
      const next = exists
        ? prev.remindedEventIds.filter((id) => id !== eventId)
        : [...prev.remindedEventIds, eventId];
      showToast(
        exists ? 'Rappel annulé' : 'Rappel programmé 15 minutes avant le direct'
      );
      return { ...prev, remindedEventIds: next };
    });
  };

  // Module 17: Anti-Spoiler Handlers
  const handleAddSpoilerRule = (keyword: string, category: InterestCategory) => {
    setAppState((prev) => {
      const exists = prev.spoilerRules.some(
        (r) => r.keyword.toLowerCase().trim() === keyword.toLowerCase().trim()
      );
      if (exists) {
        return {
          ...prev,
          spoilerRules: prev.spoilerRules.map((r) =>
            r.keyword.toLowerCase().trim() === keyword.toLowerCase().trim()
              ? { ...r, seen: false }
              : r
          ),
        };
      }
      const newRule: SpoilerRule = {
        id: `sp-${Date.now()}`,
        keyword,
        category,
        seen: false,
      };
      return { ...prev, spoilerRules: [newRule, ...prev.spoilerRules] };
    });
    showToast(`Bouclier Anti-Spoiler activé pour « ${keyword} »`);
  };

  const handleToggleEventSpoiler = (spoilerTag: string, category: InterestCategory) => {
    setAppState((prev) => {
      const existing = prev.spoilerRules.find(
        (r) => r.keyword.toLowerCase().trim() === spoilerTag.toLowerCase().trim()
      );
      if (existing) {
        const nextSeen = !existing.seen;
        showToast(
          nextSeen
            ? `Bouclier Anti-Spoiler désactivé pour « ${spoilerTag} »`
            : `Bouclier Anti-Spoiler réactivé pour « ${spoilerTag} »`
        );
        return {
          ...prev,
          spoilerRules: prev.spoilerRules.map((r) =>
            r.id === existing.id ? { ...r, seen: nextSeen } : r
          ),
        };
      }
      const newRule: SpoilerRule = {
        id: `sp-${Date.now()}`,
        keyword: spoilerTag,
        category,
        seen: false,
      };
      showToast(`Bouclier Anti-Spoiler activé pour « ${spoilerTag} »`);
      return { ...prev, spoilerRules: [newRule, ...prev.spoilerRules] };
    });
  };

  const handleToggleSpoilerSeen = (ruleId: string) => {
    setAppState((prev) => ({
      ...prev,
      spoilerRules: prev.spoilerRules.map((r) =>
        r.id === ruleId ? { ...r, seen: !r.seen } : r
      ),
    }));
    showToast('Statut du Bouclier Anti-Spoiler mis à jour');
  };

  const handleMarkSpoilerKeywordSeen = (keyword: string) => {
    setAppState((prev) => ({
      ...prev,
      spoilerRules: prev.spoilerRules.map((r) =>
        r.keyword.toLowerCase().trim() === keyword.toLowerCase().trim()
          ? { ...r, seen: true }
          : r
      ),
    }));
    showToast(`« ${keyword} » marqué comme Vu : contenus démasqués`);
  };

  const handleRemoveSpoilerRule = (ruleId: string) => {
    setAppState((prev) => ({
      ...prev,
      spoilerRules: prev.spoilerRules.filter((r) => r.id !== ruleId),
    }));
    showToast('Bouclier Anti-Spoiler supprimé');
  };

  // Module 18: Universal Mute Handlers
  const handleAddMuteRule = (keyword: string, duration: MuteDuration) => {
    setAppState((prev) => {
      const exists = prev.muteRules.some(
        (r) => r.keyword.toLowerCase().trim() === keyword.toLowerCase().trim()
      );
      if (exists) return prev;
      const newRule: MuteRule = {
        id: `mute-${Date.now()}`,
        keyword,
        duration,
        createdAtLabel: 'À l’instant',
      };
      return { ...prev, muteRules: [newRule, ...prev.muteRules] };
    });
    showToast(`Sujet « ${keyword} » masqué du Radar`);
  };

  const handleRemoveMuteRule = (ruleId: string) => {
    setAppState((prev) => ({
      ...prev,
      muteRules: prev.muteRules.filter((r) => r.id !== ruleId),
    }));
    showToast('Sujet débloqué et réintégré au flux');
  };

  // Module 9: Surprise Guest Handlers
  const handleToggleFollowGuest = (guestId: string) => {
    setAppState((prev) => ({
      ...prev,
      surpriseGuests: prev.surpriseGuests.map((g) =>
        g.id === guestId ? { ...g, followed: !g.followed } : g
      ),
    }));
    showToast('Alerte Invité Surprise mise à jour');
  };

  const handleAddCustomGuest = (name: string, specialty: InterestCategory) => {
    const newGuest: SurpriseGuestProfile = {
      id: `guest-custom-${Date.now()}`,
      name,
      role: `Personnalité ${specialty}`,
      specialty,
      followed: true,
      appearances: [
        {
          id: `app-custom-${Date.now()}`,
          showTitle: `${name} — Grand entretien inattendu hors promo`,
          hostMedia: 'Podcast Indépendant · Le Postcast',
          format: 'Podcasts',
          dateLabel: 'Détecté aujourd’hui',
          unexpectedReason: `Apparition surprise détectée par Radar hors de ses canaux habituels (${specialty}).`,
          durationMinutes: 64,
          highlightTimestamp: '18:30',
          externalUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
            name + ' interview podcast'
          )}`,
        },
      ],
    };
    setAppState((prev) => ({
      ...prev,
      surpriseGuests: [newGuest, ...prev.surpriseGuests],
    }));
    showToast(`Radar d’Invité Surprise activé pour ${name}`);
  };

  // Trust Circle Handlers
  const handleToggleCircleMember = (memberId: string) => {
    setAppState((prev) => ({
      ...prev,
      trustCircle: prev.trustCircle.map((m) =>
        m.id === memberId ? { ...m, inCircle: !m.inCircle } : m
      ),
    }));
    showToast('Cercle de confiance mis à jour');
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
    showToast(`${name} a été ajouté à votre Cercle de confiance`);
  };

  const handleAddAiGems = (newGems: RadarContentItem[]) => {
    setItems((prev) => [...newGems, ...prev]);
    showToast('2 nouvelles pépites sur mesure ajoutées à votre flux');
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
        onlyAccessibleNow: appState.onlyAccessibleNow,
        ownedSubscriptions: appState.ownedSubscriptions,
        muteRules: appState.muteRules,
        spoilerRules: appState.spoilerRules,
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
      appState.onlyAccessibleNow,
      appState.ownedSubscriptions,
      appState.muteRules,
      appState.spoilerRules,
    ]
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-slate-50 dark:bg-[#0B0D13] text-slate-900 dark:text-slate-100 pb-20 md:pb-12">
      {/* DOUBLE BARRE ALPHABETTE (Style Info Perso, dimensions fixes en px) */}
      <AlphabetteDoubleBar
        appTitle="Radar"
        appSubtitle="ASSISTANT ANTI-FOMO"
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        isBigMode={isBigMode}
        onToggleBigMode={handleToggleBigMode}
        isSimpleMode={isSimpleMode}
        onToggleSimpleMode={handleToggleSimpleMode}
        onNavigateHome={() => setActiveTab('radar')}
        onShowToast={showToast}
      />

      {/* FLOATING TOAST FEEDBACK */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-[calc(100vw-2rem)] px-4 py-3 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700 dark:border-amber-400"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTAINER (1440px responsive workspace, isolé pour mode BIG) */}
      <main
        className={`flex-1 w-full max-w-7xl mx-auto px-3 sm:px-8 pt-5 space-y-6 ${
          isBigMode ? 'radar-big-mode' : ''
        } ${isSimpleMode ? 'radar-simple-mode' : ''}`}
      >
        {/* DESKTOP 5-TAB NAVIGATION (Hors de la Double Barre pour respecter la règle d'en-tête) */}
        <nav
          aria-label="Navigation principale"
          className="no-print hidden md:flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-xs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('radar')}
            aria-current={activeTab === 'radar' ? 'page' : undefined}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-[#3f51b5] text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0" />
            <span>Radar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explorer')}
            aria-current={activeTab === 'explorer' ? 'page' : undefined}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'explorer'
                ? 'bg-[#3f51b5] text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catchup')}
            aria-current={activeTab === 'catchup' ? 'page' : undefined}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'catchup'
                ? 'bg-[#3f51b5] text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4 shrink-0" />
            <span>Rattrapage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agenda')}
            aria-current={activeTab === 'agenda' ? 'page' : undefined}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'agenda'
                ? 'bg-[#3f51b5] text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            aria-current={activeTab === 'watchlist' ? 'page' : undefined}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-[#3f51b5] text-white dark:bg-amber-500 dark:text-slate-950'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4 shrink-0" />
            <span>Mon Espace</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'watchlist'
                  ? 'bg-white/20 text-white dark:bg-slate-950/20 dark:text-slate-950'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {appState.watchlistIds.length}
            </span>
          </button>
        </nav>

        {/* Contextual Onboarding & Search Strip */}
        <div className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
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
              <span>Personnaliser mes goûts & abonnements</span>
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
            ownedSubscriptions={appState.ownedSubscriptions}
            onlyAccessibleNow={appState.onlyAccessibleNow}
            onToggleOnlyAccessibleNow={handleToggleOnlyAccessibleNow}
            disconnectMode={appState.disconnectMode}
            onSwitchToCatchupMagazine={() => setActiveTab('catchup')}
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
            onMuteKeyword={handleAddMuteRule}
            onMarkSpoilerSeen={handleMarkSpoilerKeywordSeen}
            trustCircle={appState.trustCircle}
          />
        )}

        {activeTab === 'explorer' && (
          <ExplorerTab
            allItems={items}
            userInterests={appState.interests}
            ownedSubscriptions={appState.ownedSubscriptions}
            onlyAccessibleNow={appState.onlyAccessibleNow}
            muteRules={appState.muteRules}
            surpriseGuests={appState.surpriseGuests}
            onToggleFollowGuest={handleToggleFollowGuest}
            onAddCustomGuest={handleAddCustomGuest}
            watchlistIds={appState.watchlistIds}
            onToggleSave={handleToggleSaveWatchlist}
            onOpenDetail={setSelectedDetailItem}
          />
        )}

        {activeTab === 'catchup' && (
          <CatchupTab
            allItems={items}
            interests={appState.interests}
            platforms={appState.platforms}
            muteRules={appState.muteRules}
            disconnectMode={appState.disconnectMode}
            onToggleDisconnectMode={handleToggleDisconnectMode}
            watchlistIds={appState.watchlistIds}
            onToggleSave={handleToggleSaveWatchlist}
            onOpenDetail={setSelectedDetailItem}
            onMuteKeyword={handleAddMuteRule}
            onMarkSpoilerSeen={handleMarkSpoilerKeywordSeen}
          />
        )}

        {activeTab === 'agenda' && (
          <AgendaTab
            events={INITIAL_AGENDA_EVENTS}
            remindedEventIds={appState.remindedEventIds}
            onToggleReminder={handleToggleReminder}
            spoilerRules={appState.spoilerRules}
            onToggleEventSpoiler={handleToggleEventSpoiler}
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
            ownedSubscriptions={appState.ownedSubscriptions}
            onToggleSubscription={handleToggleSubscription}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            spoilerRules={appState.spoilerRules}
            onAddSpoilerRule={handleAddSpoilerRule}
            onToggleSpoilerSeen={handleToggleSpoilerSeen}
            onRemoveSpoilerRule={handleRemoveSpoilerRule}
            muteRules={appState.muteRules}
            onAddMuteRule={handleAddMuteRule}
            onRemoveMuteRule={handleRemoveMuteRule}
            trustCircle={appState.trustCircle}
            onToggleCircleMember={handleToggleCircleMember}
            onAddCustomCircleMember={handleAddCustomCircleMember}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (5 Primary Tabs, Touch-first 44px+ hitboxes) */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0E1118]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('radar')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'radar'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Radar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'explorer'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Explorer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catchup')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'catchup'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Rattrapage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'agenda'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`h-full flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'watchlist'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Mon Espace</span>
        </button>
      </nav>

      {/* ONBOARDING MODAL (Calibration des goûts & abonnements sans compte) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        interests={appState.interests}
        platforms={appState.platforms}
        ownedSubscriptions={appState.ownedSubscriptions}
        onToggleInterest={handleToggleInterest}
        onTogglePlatform={handleTogglePlatform}
        onToggleSubscription={handleToggleSubscription}
        onComplete={() => {
          setAppState((prev) => ({ ...prev, hasCompletedOnboarding: true }));
          setIsOnboardingOpen(false);
          showToast('Votre Radar a été recalibré avec succès');
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
