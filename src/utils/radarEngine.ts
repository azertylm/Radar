import {
  CatchupDuration,
  ContentFormat,
  FeedSourceMode,
  FomoUrgency,
  InterestCategory,
  MoodFilter,
  MuteRule,
  RadarContentItem,
  SpoilerRule,
  SubscriptionId,
} from '../types/radar';

export interface FilterOptions {
  interests: InterestCategory[];
  platforms: ContentFormat[];
  sourceMode: FeedSourceMode;
  circleMemberIds: string[];
  urgencyFilter: FomoUrgency | 'all';
  formatFilter: ContentFormat | 'all';
  moodFilter: MoodFilter;
  outOfBubblePercent: number; // 0 to 50
  onlyAccessibleNow?: boolean;
  ownedSubscriptions?: SubscriptionId[];
  muteRules?: MuteRule[];
  spoilerRules?: SpoilerRule[];
  searchQuery?: string;
}

const URGENCY_WEIGHT: Record<FomoUrgency, number> = {
  live: 3,
  expiring: 2,
  anytime: 1,
};

/**
 * Checks if a content item matches any active Mute rule.
 */
export function isItemMuted(item: RadarContentItem, muteRules: MuteRule[] = []): boolean {
  if (!muteRules.length) return false;
  const hay = `${item.title} ${item.summary} ${item.creator} ${item.source} ${item.category}`.toLowerCase();
  return muteRules.some((rule) => {
    const kw = rule.keyword.trim().toLowerCase();
    return kw.length > 0 && hay.includes(kw);
  });
}

/**
 * Checks if a content item matches an active (unseen) Anti-Spoiler shield keyword.
 * Returns the matched keyword if shielded, or undefined otherwise.
 */
export function getMatchedSpoilerKeyword(
  item: RadarContentItem,
  spoilerRules: SpoilerRule[] = []
): string | undefined {
  const activeRules = spoilerRules.filter((r) => !r.seen && r.keyword.trim().length > 0);
  if (!activeRules.length) return undefined;
  const hay = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
  for (const rule of activeRules) {
    const kw = rule.keyword.trim().toLowerCase();
    if (hay.includes(kw)) {
      return rule.keyword;
    }
    // Also check tokens if keyword has multiple words like "PSG — Bayern Munich"
    const tokens = kw
      .split(/[\s—\-/]+/)
      .filter((t) => t.length >= 3);
    if (tokens.length >= 2 && tokens.every((t) => hay.includes(t))) {
      return rule.keyword;
    }
  }
  return undefined;
}

/**
 * Pure function that filters (including Universal Mute, Accessible Now, Hidden Gems, and Anti-Spoiler tagging),
 * injects "Hors de ma bulle" items according to the 0-50% slider,
 * and sorts the Radar feed according to urgency, source mode, and mood.
 */
export function filterAndRankFeed(
  items: RadarContentItem[],
  options: FilterOptions
): RadarContentItem[] {
  const {
    interests,
    platforms,
    sourceMode,
    circleMemberIds,
    urgencyFilter,
    formatFilter,
    moodFilter,
    outOfBubblePercent,
    onlyAccessibleNow = false,
    ownedSubscriptions = ['free'],
    muteRules = [],
    spoilerRules = [],
    searchQuery = '',
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 1. Apply Universal Mute & Hard Toolbar Filters first
  const baseEligible = items.filter((item) => {
    if (isItemMuted(item, muteRules)) {
      return false;
    }
    if (onlyAccessibleNow) {
      const hasAccess = item.isFree || ownedSubscriptions.includes(item.subscriptionId);
      if (!hasAccess) {
        return false;
      }
    }
    if (urgencyFilter !== 'all' && item.urgency !== urgencyFilter) {
      return false;
    }
    if (formatFilter !== 'all' && item.format !== formatFilter) {
      return false;
    }
    if (moodFilter !== 'all' && item.mood !== moodFilter) {
      return false;
    }
    if (normalizedQuery) {
      const hay = `${item.title} ${item.source} ${item.creator} ${item.category} ${item.summary}`.toLowerCase();
      if (!hay.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });

  // 2. Apply Source Mode constraint
  const sourceFiltered = baseEligible.filter((item) => {
    if (sourceMode === 'hidden_gems') {
      return Boolean(item.isHiddenGem);
    }
    if (sourceMode === 'trust_circle') {
      return (
        item.recommendedByCircleIds.some((id) => circleMemberIds.includes(id)) ||
        (item.creatorId !== undefined && circleMemberIds.includes(item.creatorId))
      );
    }
    if (sourceMode === 'taste_twins') {
      return item.twinMatchPercent >= 90;
    }
    return true;
  });

  // 3. Split into In-Bubble (matches user interests) and Out-Of-Bubble (outside user interests)
  const activeInterests =
    interests.length > 0 ? interests : (['Tech/IA', 'Cinéma', 'Actualités'] as InterestCategory[]);
  const activePlatforms = platforms;

  const inBubble: RadarContentItem[] = [];
  const outOfBubbleCandidates: RadarContentItem[] = [];

  for (const rawItem of sourceFiltered) {
    const matchedSpoilerKeyword = getMatchedSpoilerKeyword(rawItem, spoilerRules);
    const matchesInterest = activeInterests.includes(rawItem.category);
    const item: RadarContentItem = {
      ...rawItem,
      isOutOfBubble: !matchesInterest,
      matchedSpoilerKeyword,
    };
    if (matchesInterest) {
      inBubble.push(item);
    } else {
      outOfBubbleCandidates.push(item);
    }
  }

  const sortItems = (list: RadarContentItem[]) => {
    return [...list].sort((a, b) => {
      if (sourceMode === 'taste_twins' || sourceMode === 'hidden_gems') {
        if (b.twinMatchPercent !== a.twinMatchPercent) {
          return b.twinMatchPercent - a.twinMatchPercent;
        }
      }
      const aPlat = activePlatforms.length === 0 || activePlatforms.includes(a.format) ? 1 : 0;
      const bPlat = activePlatforms.length === 0 || activePlatforms.includes(b.format) ? 1 : 0;
      if (URGENCY_WEIGHT[b.urgency] !== URGENCY_WEIGHT[a.urgency]) {
        return URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency];
      }
      if (bPlat !== aPlat) {
        return bPlat - aPlat;
      }
      return b.twinMatchPercent - a.twinMatchPercent;
    });
  };

  const sortedInBubble = sortItems(inBubble);
  const sortedOutOfBubble = [...outOfBubbleCandidates].sort(
    (a, b) =>
      b.twinMatchPercent - a.twinMatchPercent ||
      URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency]
  );

  // If in trust_circle or hidden_gems mode, show all matching picks directly
  if (sourceMode === 'trust_circle' || sourceMode === 'hidden_gems') {
    return sortItems([...sortedInBubble, ...sortedOutOfBubble]);
  }

  // 4. Calculate how many Out-Of-Bubble discovery items to inject based on outOfBubblePercent (0 to 50)
  const clampedPercent = Math.max(0, Math.min(50, outOfBubblePercent));
  if (clampedPercent === 0 || sortedOutOfBubble.length === 0) {
    return sortedInBubble;
  }

  const baseCount = Math.max(sortedInBubble.length, 4);
  const targetOutCount = Math.max(
    1,
    Math.min(
      sortedOutOfBubble.length,
      Math.round((baseCount * clampedPercent) / Math.max(50, 100 - clampedPercent))
    )
  );

  const selectedOut = sortedOutOfBubble.slice(0, targetOutCount);

  const merged: RadarContentItem[] = [];
  const step = Math.max(1, Math.floor(sortedInBubble.length / (selectedOut.length + 1)));
  let outIdx = 0;

  for (let i = 0; i < sortedInBubble.length; i++) {
    merged.push(sortedInBubble[i]);
    if ((i + 1) % step === 0 && outIdx < selectedOut.length) {
      merged.push(selectedOut[outIdx]);
      outIdx++;
    }
  }
  while (outIdx < selectedOut.length) {
    merged.push(selectedOut[outIdx]);
    outIdx++;
  }

  return merged;
}

/**
 * Generates a custom Catch-up playlist whose total duration matches the selected slot
 * (5 min, 15 min, 30 min, or 60 min) while respecting Universal Mute rules.
 */
export function buildCatchupPlaylist(
  items: RadarContentItem[],
  targetMinutes: CatchupDuration,
  interests: InterestCategory[],
  muteRules: MuteRule[] = []
): {
  playlist: RadarContentItem[];
  totalMinutes: number;
  targetMinutes: CatchupDuration;
} {
  const unmuted = items.filter((item) => !isItemMuted(item, muteRules));
  const scored = [...unmuted].sort((a, b) => {
    const aInterest = interests.includes(a.category) ? 20 : 0;
    const bInterest = interests.includes(b.category) ? 20 : 0;
    const aScore = aInterest + URGENCY_WEIGHT[a.urgency] * 10 + a.twinMatchPercent / 10;
    const bScore = bInterest + URGENCY_WEIGHT[b.urgency] * 10 + b.twinMatchPercent / 10;
    return bScore - aScore;
  });

  let bestSelection: RadarContentItem[] = [];
  let bestDiff = Infinity;
  let bestVariety = -1;

  function evaluateCandidate(selection: RadarContentItem[], sum: number) {
    const diff = Math.abs(targetMinutes - sum);
    const formats = new Set(selection.map((i) => i.format)).size;
    if (diff < bestDiff || (diff === bestDiff && formats > bestVariety)) {
      bestDiff = diff;
      bestVariety = formats;
      bestSelection = [...selection];
    }
  }

  const pool = scored.slice(0, 24);

  function backtrack(startIdx: number, current: RadarContentItem[], currentSum: number) {
    if (current.length > 0 && currentSum <= targetMinutes) {
      evaluateCandidate(current, currentSum);
    }
    if (bestDiff === 0 && bestVariety >= Math.min(3, current.length)) {
      return;
    }
    if (current.length >= 5) {
      return;
    }

    for (let i = startIdx; i < pool.length; i++) {
      const nextSum = currentSum + pool[i].durationMinutes;
      if (nextSum <= targetMinutes) {
        current.push(pool[i]);
        backtrack(i + 1, current, nextSum);
        current.pop();
        if (bestDiff === 0 && bestVariety >= 3) {
          return;
        }
      }
    }
  }

  backtrack(0, [], 0);

  const totalMinutes = bestSelection.reduce((acc, item) => acc + item.durationMinutes, 0);
  return {
    playlist: bestSelection,
    totalMinutes,
    targetMinutes,
  };
}

/**
 * Mode "Soirée à plusieurs" : Crosses the user's interests with a friend/guest's 2-3 chosen desires
 * and returns a consensus selection of films, shows, or videos with a Duo Compatibility score.
 */
export function buildPartyModeSelection(
  items: RadarContentItem[],
  userInterests: InterestCategory[],
  guestInterests: InterestCategory[],
  mood: MoodFilter = 'all',
  onlyAccessibleNow = false,
  ownedSubscriptions: SubscriptionId[] = ['free'],
  muteRules: MuteRule[] = []
): {
  recommendations: Array<RadarContentItem & { duoCompatibility: number; sharedReason: string }>;
  overallDuoCompatibility: number;
} {
  const unmuted = items.filter((item) => {
    if (isItemMuted(item, muteRules)) return false;
    if (onlyAccessibleNow && !item.isFree && !ownedSubscriptions.includes(item.subscriptionId)) {
      return false;
    }
    if (mood !== 'all' && item.mood !== mood) return false;
    // Prefer watchable/listenable together formats
    return (
      item.format === 'TV/Replay' ||
      item.format === 'Streaming' ||
      item.format === 'YouTube' ||
      item.format === 'Podcasts'
    );
  });

  const sharedCategories = userInterests.filter((c) => guestInterests.includes(c));
  const unionCategories = Array.from(new Set([...userInterests, ...guestInterests]));

  const scored = unmuted.map((item) => {
    const inUser = userInterests.includes(item.category);
    const inGuest = guestInterests.includes(item.category);
    let bonus = 0;
    let sharedReason = '';

    if (inUser && inGuest) {
      bonus = 18;
      sharedReason = `Passion commune du duo : ${item.category}`;
    } else if (inGuest) {
      bonus = 12;
      sharedReason = `Coup de cœur pour l’invité (${item.category}) validé à ${item.twinMatchPercent} %`;
    } else if (inUser) {
      bonus = 10;
      sharedReason = `Dans vos favoris (${item.category}) & très accessible à plusieurs`;
    } else {
      bonus = 4;
      sharedReason = `Consensus universel des Jumeaux (${item.twinMatchPercent} %)`;
    }

    const duoCompatibility = Math.min(99, Math.round(item.twinMatchPercent * 0.82 + bonus));
    return {
      ...item,
      duoCompatibility,
      sharedReason,
    };
  });

  scored.sort((a, b) => b.duoCompatibility - a.duoCompatibility);
  const topPicks = scored.slice(0, 6);

  const overlapRatio =
    unionCategories.length > 0 ? sharedCategories.length / Math.min(userInterests.length || 1, guestInterests.length || 1) : 0.5;
  const overallDuoCompatibility = Math.min(98, Math.max(82, Math.round(84 + overlapRatio * 14)));

  return {
    recommendations: topPicks,
    overallDuoCompatibility,
  };
}

/**
 * Returns the 5 essential gems for "Le Journal du Dimanche" (Mode Déconnexion / Édition Magazine).
 */
export function getSundayMagazineEdition(
  items: RadarContentItem[],
  interests: InterestCategory[],
  muteRules: MuteRule[] = []
): RadarContentItem[] {
  const unmuted = items.filter((i) => !isItemMuted(i, muteRules));
  const sorted = [...unmuted].sort((a, b) => {
    const aMag = a.isMagazineEditionPick ? 15 : 0;
    const bMag = b.isMagazineEditionPick ? 15 : 0;
    const aInt = interests.includes(a.category) ? 10 : 0;
    const bInt = interests.includes(b.category) ? 10 : 0;
    return bMag + bInt + b.twinMatchPercent - (aMag + aInt + a.twinMatchPercent);
  });
  return sorted.slice(0, 5);
}

/**
 * Sorts the unified Watchlist by expiration priority or format.
 */
export function sortWatchlistItems(
  items: RadarContentItem[],
  sortBy: 'expiration' | 'format'
): RadarContentItem[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'format') {
      if (a.format !== b.format) {
        return a.format.localeCompare(b.format, 'fr');
      }
    }
    const aExp =
      a.urgency === 'expiring' ? a.expiresInHours ?? 24 : a.urgency === 'live' ? 0 : 9999;
    const bExp =
      b.urgency === 'expiring' ? b.expiresInHours ?? 24 : b.urgency === 'live' ? 0 : 9999;
    if (aExp !== bExp) {
      return aExp - bExp;
    }
    return b.twinMatchPercent - a.twinMatchPercent;
  });
}

/**
 * Resolves a direct, clickable URL and concise platform host name for any content item.
 * Also builds a deep-link timestamp URL when a highlight moment is present.
 */
export function getDirectPlatformLink(item: {
  title: string;
  source: string;
  format: ContentFormat;
  externalUrl?: string;
  highlightSeconds?: number;
}): { url: string; highlightUrl: string; platformLabel: string; domain: string } {
  const s = item.source.toLowerCase();
  const q = encodeURIComponent(item.title);
  const tSec = item.highlightSeconds || 0;

  const withTime = (baseUrl: string) => {
    if (!tSec) return baseUrl;
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}t=${tSec}s`;
  };

  if (item.externalUrl && item.externalUrl.startsWith('http')) {
    try {
      const parsed = new URL(item.externalUrl);
      return {
        url: item.externalUrl,
        highlightUrl: withTime(item.externalUrl),
        platformLabel: item.source.split('·')[0].trim(),
        domain: parsed.hostname.replace(/^www\./, ''),
      };
    } catch {
      // fall through
    }
  }

  if (s.includes('arte')) {
    const base = `https://www.arte.tv/fr/search/?q=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Arte.tv', domain: 'arte.tv' };
  }
  if (s.includes('youtube')) {
    const base = `https://www.youtube.com/results?search_query=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'YouTube', domain: 'youtube.com' };
  }
  if (s.includes('twitch')) {
    const base = `https://www.twitch.tv/search?term=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Twitch', domain: 'twitch.tv' };
  }
  if (
    s.includes('france inter') ||
    s.includes('france culture') ||
    s.includes('radio france') ||
    s.includes('fip')
  ) {
    const base = `https://www.radiofrance.fr/recherche?term=${q}`;
    return {
      url: base,
      highlightUrl: withTime(base),
      platformLabel: 'Radio France',
      domain: 'radiofrance.fr',
    };
  }
  if (s.includes('france.tv') || s.includes('france 5')) {
    const base = `https://www.france.tv/recherche/?q=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'France.tv', domain: 'france.tv' };
  }
  if (s.includes('canal')) {
    const base = `https://www.canalplus.com/`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Canal+', domain: 'canalplus.com' };
  }
  if (s.includes('netflix')) {
    const base = `https://www.netflix.com/search?q=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Netflix', domain: 'netflix.com' };
  }
  if (s.includes('prime video') || s.includes('prime')) {
    const base = `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
    return {
      url: base,
      highlightUrl: withTime(base),
      platformLabel: 'Prime Video',
      domain: 'primevideo.com',
    };
  }
  if (s.includes('bein')) {
    const base = `https://www.beinsports.com/fr-fr`;
    return {
      url: base,
      highlightUrl: withTime(base),
      platformLabel: 'beIN Sports',
      domain: 'beinsports.com',
    };
  }
  if (s.includes('mubi')) {
    const base = `https://mubi.com/fr/films`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'MUBI', domain: 'mubi.com' };
  }
  if (s.includes('le monde')) {
    const base = `https://www.lemonde.fr/recherche/?search_keywords=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Le Monde', domain: 'lemonde.fr' };
  }
  if (s.includes('mediapart')) {
    const base = `https://www.mediapart.fr/search?search_word=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Mediapart', domain: 'mediapart.fr' };
  }
  if (s.includes('bluesky')) {
    const base = `https://bsky.app/search?q=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Bluesky', domain: 'bsky.app' };
  }
  if (s.includes('reddit')) {
    const base = `https://www.reddit.com/r/france/search/?q=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Reddit', domain: 'reddit.com' };
  }
  if (s.includes('slate') || s.includes('transfert')) {
    const base = `https://www.slate.fr/podcasts/`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Slate Audio', domain: 'slate.fr' };
  }
  if (s.includes('les jours')) {
    const base = `https://lesjours.fr/`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Les Jours', domain: 'lesjours.fr' };
  }

  if (item.format === 'YouTube') {
    const base = `https://www.youtube.com/results?search_query=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'YouTube', domain: 'youtube.com' };
  }
  if (item.format === 'Podcasts') {
    const base = `https://www.radiofrance.fr/recherche?term=${q}`;
    return { url: base, highlightUrl: withTime(base), platformLabel: 'Podcast', domain: 'radiofrance.fr' };
  }

  const base = `https://www.google.fr/search?q=${q}`;
  return {
    url: base,
    highlightUrl: withTime(base),
    platformLabel: item.source.split('·')[0].trim(),
    domain: 'accès direct',
  };
}
