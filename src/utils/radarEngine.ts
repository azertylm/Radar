import {
  CatchupDuration,
  ContentFormat,
  FeedSourceMode,
  FomoUrgency,
  InterestCategory,
  MoodFilter,
  RadarContentItem,
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
  searchQuery?: string;
}

const URGENCY_WEIGHT: Record<FomoUrgency, number> = {
  live: 3,
  expiring: 2,
  anytime: 1,
};

/**
 * Pure function that filters, injects "Hors de ma bulle" items according to the 0-50% slider,
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
    searchQuery = '',
  } = options;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 1. Apply hard explicit toolbar filters first (Urgency, Format, Mood, Search)
  const baseEligible = items.filter((item) => {
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
  const activeInterests = interests.length > 0 ? interests : (['Tech/IA', 'Cinéma', 'Actualités'] as InterestCategory[]);
  const activePlatforms = platforms;

  const inBubble: RadarContentItem[] = [];
  const outOfBubbleCandidates: RadarContentItem[] = [];

  for (const item of sourceFiltered) {
    const matchesInterest = activeInterests.includes(item.category);
    if (matchesInterest) {
      inBubble.push({ ...item, isOutOfBubble: false });
    } else {
      outOfBubbleCandidates.push({ ...item, isOutOfBubble: true });
    }
  }

  // Sort helper
  const sortItems = (list: RadarContentItem[]) => {
    return [...list].sort((a, b) => {
      if (sourceMode === 'taste_twins') {
        if (b.twinMatchPercent !== a.twinMatchPercent) {
          return b.twinMatchPercent - a.twinMatchPercent;
        }
      }
      // Prioritize platform match softly
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
    (a, b) => b.twinMatchPercent - a.twinMatchPercent || URGENCY_WEIGHT[b.urgency] - URGENCY_WEIGHT[a.urgency]
  );

  // If in trust_circle mode, show all circle picks directly while preserving out-of-bubble badge
  if (sourceMode === 'trust_circle') {
    return sortItems([...sortedInBubble, ...sortedOutOfBubble]);
  }

  // 4. Calculate how many Out-Of-Bubble discovery items to inject based on outOfBubblePercent (0 to 50)
  const clampedPercent = Math.max(0, Math.min(50, outOfBubblePercent));
  if (clampedPercent === 0 || sortedOutOfBubble.length === 0) {
    return sortedInBubble;
  }

  // Ratio: outCount / (inCount + outCount) ≈ clampedPercent / 100
  // => outCount = round(inCount * (p / (100 - p)))
  const baseCount = Math.max(sortedInBubble.length, 4);
  const targetOutCount = Math.max(
    1,
    Math.min(
      sortedOutOfBubble.length,
      Math.round((baseCount * clampedPercent) / Math.max(50, 100 - clampedPercent))
    )
  );

  const selectedOut = sortedOutOfBubble.slice(0, targetOutCount);

  // Interleave smoothly so out-of-bubble gems appear naturally in the stream
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
 * (5 min, 15 min, 30 min, or 60 min) while maximizing format variety and FOMO priority.
 */
export function buildCatchupPlaylist(
  items: RadarContentItem[],
  targetMinutes: CatchupDuration,
  interests: InterestCategory[]
): {
  playlist: RadarContentItem[];
  totalMinutes: number;
  targetMinutes: CatchupDuration;
} {
  // Score each item by interest match + urgency + format diversity
  const scored = [...items].sort((a, b) => {
    const aInterest = interests.includes(a.category) ? 20 : 0;
    const bInterest = interests.includes(b.category) ? 20 : 0;
    const aScore = aInterest + URGENCY_WEIGHT[a.urgency] * 10 + a.twinMatchPercent / 10;
    const bScore = bInterest + URGENCY_WEIGHT[b.urgency] * 10 + b.twinMatchPercent / 10;
    return bScore - aScore;
  });

  // Find an exact sum combination first using bounded subset search with format variety preference
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

  // Search up to top 22 items for exact duration match
  const pool = scored.slice(0, 22);

  function backtrack(startIdx: number, current: RadarContentItem[], currentSum: number) {
    if (current.length > 0 && currentSum <= targetMinutes) {
      evaluateCandidate(current, currentSum);
    }
    if (bestDiff === 0 && bestVariety >= Math.min(3, current.length)) {
      return; // Found an ideal exact match with great format diversity
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
    // Expiration priority: expiring with lowest hours first, then live, then anytime
    const aExp = a.urgency === 'expiring' ? a.expiresInHours ?? 24 : a.urgency === 'live' ? 0 : 9999;
    const bExp = b.urgency === 'expiring' ? b.expiresInHours ?? 24 : b.urgency === 'live' ? 0 : 9999;
    if (aExp !== bExp) {
      return aExp - bExp;
    }
    return b.twinMatchPercent - a.twinMatchPercent;
  });
}

/**
 * Resolves a direct, clickable URL and concise platform host name for any content item.
 */
export function getDirectPlatformLink(item: {
  title: string;
  source: string;
  format: ContentFormat;
  externalUrl?: string;
}): { url: string; platformLabel: string; domain: string } {
  const s = item.source.toLowerCase();
  const q = encodeURIComponent(item.title);

  if (item.externalUrl && item.externalUrl.startsWith('http')) {
    try {
      const parsed = new URL(item.externalUrl);
      return {
        url: item.externalUrl,
        platformLabel: item.source.split('·')[0].trim(),
        domain: parsed.hostname.replace(/^www\./, ''),
      };
    } catch {
      // fall through to smart platform resolver
    }
  }

  if (s.includes('arte')) {
    return {
      url: `https://www.arte.tv/fr/search/?q=${q}`,
      platformLabel: 'Arte.tv',
      domain: 'arte.tv',
    };
  }
  if (s.includes('youtube')) {
    return {
      url: `https://www.youtube.com/results?search_query=${q}`,
      platformLabel: 'YouTube',
      domain: 'youtube.com',
    };
  }
  if (s.includes('twitch')) {
    return {
      url: `https://www.twitch.tv/search?term=${q}`,
      platformLabel: 'Twitch',
      domain: 'twitch.tv',
    };
  }
  if (s.includes('france inter') || s.includes('france culture') || s.includes('radio france') || s.includes('fip')) {
    return {
      url: `https://www.radiofrance.fr/recherche?term=${q}`,
      platformLabel: 'Radio France',
      domain: 'radiofrance.fr',
    };
  }
  if (s.includes('france.tv') || s.includes('france 5')) {
    return {
      url: `https://www.france.tv/recherche/?q=${q}`,
      platformLabel: 'France.tv',
      domain: 'france.tv',
    };
  }
  if (s.includes('canal')) {
    return {
      url: `https://www.canalplus.com/`,
      platformLabel: 'Canal+',
      domain: 'canalplus.com',
    };
  }
  if (s.includes('mubi')) {
    return {
      url: `https://mubi.com/fr/films`,
      platformLabel: 'MUBI',
      domain: 'mubi.com',
    };
  }
  if (s.includes('le monde')) {
    return {
      url: `https://www.lemonde.fr/recherche/?search_keywords=${q}`,
      platformLabel: 'Le Monde',
      domain: 'lemonde.fr',
    };
  }
  if (s.includes('mediapart')) {
    return {
      url: `https://www.mediapart.fr/search?search_word=${q}`,
      platformLabel: 'Mediapart',
      domain: 'mediapart.fr',
    };
  }
  if (s.includes('bluesky')) {
    return {
      url: `https://bsky.app/search?q=${q}`,
      platformLabel: 'Bluesky',
      domain: 'bsky.app',
    };
  }
  if (s.includes('reddit')) {
    return {
      url: `https://www.reddit.com/r/france/search/?q=${q}`,
      platformLabel: 'Reddit',
      domain: 'reddit.com',
    };
  }
  if (s.includes('slate') || s.includes('transfert')) {
    return {
      url: `https://www.slate.fr/podcasts/`,
      platformLabel: 'Slate Audio',
      domain: 'slate.fr',
    };
  }
  if (s.includes('les jours')) {
    return {
      url: `https://lesjours.fr/`,
      platformLabel: 'Les Jours',
      domain: 'lesjours.fr',
    };
  }

  // Fallback by format
  if (item.format === 'YouTube') {
    return {
      url: `https://www.youtube.com/results?search_query=${q}`,
      platformLabel: 'YouTube',
      domain: 'youtube.com',
    };
  }
  if (item.format === 'Podcasts') {
    return {
      url: `https://www.radiofrance.fr/recherche?term=${q}`,
      platformLabel: 'Podcast',
      domain: 'radiofrance.fr',
    };
  }

  return {
    url: `https://www.google.fr/search?q=${q}`,
    platformLabel: item.source.split('·')[0].trim(),
    domain: 'accès direct',
  };
}

