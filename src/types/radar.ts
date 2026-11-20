export type InterestCategory =
  | 'Tech/IA'
  | 'Cinéma'
  | 'Sport'
  | 'Musique'
  | 'Humour'
  | 'Actualités'
  | 'Sciences'
  | 'Gaming'
  | 'Culture';

export type ContentFormat =
  | 'TV/Replay'
  | 'YouTube'
  | 'Podcasts'
  | 'Réseaux sociaux'
  | 'Streaming'
  | 'Presse';

export type SubscriptionId =
  | 'free'
  | 'netflix'
  | 'canal'
  | 'prime'
  | 'disney'
  | 'mubi'
  | 'bein'
  | 'presse_abo';

export type FomoUrgency = 'live' | 'expiring' | 'anytime';

export type MoodFilter = 'all' | 'laugh' | 'learn' | 'background' | 'serious';

export type FeedSourceMode = 'for_you' | 'taste_twins' | 'trust_circle' | 'hidden_gems';

export type CatchupDuration = 5 | 15 | 30 | 60;

export type AgendaDayGroup = 'today' | 'tomorrow' | 'week';

export type MuteDuration = '24h' | '7d' | 'forever';

export interface HighlightMoment {
  timestamp: string; // e.g. "42:15"
  seconds: number;
  label: string; // e.g. "L'annonce surprise sur l'open-source"
}

export interface RadarContentItem {
  id: string;
  title: string;
  source: string;
  creator: string;
  creatorId?: string;
  format: ContentFormat;
  category: InterestCategory;
  durationMinutes: number;
  urgency: FomoUrgency;
  expiresInHours?: number;
  liveViewers?: number;
  mood: Exclude<MoodFilter, 'all'>;
  twinMatchPercent: number;
  twinCount: number;
  recommendedByCircleIds: string[];
  summary: string;
  keyTakeaway?: string;
  threeBulletPoints: [string, string, string];
  highlightMoment?: HighlightMoment;
  isHiddenGem?: boolean;
  viewsLabel?: string; // e.g. "3 400 vues" or "Podcast indé · 1 900 écoutes"
  isFree: boolean;
  subscriptionId: SubscriptionId;
  subscriptionLabel?: string;
  filRougeId?: string;
  surpriseGuestId?: string;
  isMagazineEditionPick?: boolean;
  publishedAt: string;
  imageUrl?: string;
  isBuzzPeak?: boolean;
  buzzReason?: string;
  actionLabel?: string;
  externalUrl?: string;
  // Computed dynamically by radarEngine
  isOutOfBubble?: boolean;
  matchedSpoilerKeyword?: string;
}

export interface SurpriseGuestProfile {
  id: string;
  name: string;
  role: string;
  specialty: InterestCategory;
  followed: boolean;
  appearances: Array<{
    id: string;
    showTitle: string;
    hostMedia: string;
    format: ContentFormat;
    dateLabel: string;
    unexpectedReason: string;
    durationMinutes: number;
    highlightTimestamp?: string;
    externalUrl?: string;
  }>;
}

export interface FilRougeStoryline {
  id: string;
  title: string;
  category: InterestCategory;
  subtitle: string;
  activeFollowers: number;
  steps: Array<{
    id: string;
    timeLabel: string;
    mediaType: ContentFormat;
    source: string;
    title: string;
    summary: string;
    durationMinutes: number;
    externalUrl?: string;
  }>;
}

export interface MuteRule {
  id: string;
  keyword: string;
  duration: MuteDuration;
  createdAtLabel: string;
}

export interface SpoilerRule {
  id: string;
  keyword: string;
  category?: InterestCategory;
  seen: boolean;
}

export interface TrustCircleMember {
  id: string;
  name: string;
  handle: string;
  role: 'Ami' | 'Créateur' | 'Journaliste';
  specialty: InterestCategory;
  avatarInitials: string;
  inCircle: boolean;
  recentPickTitle: string;
}

export interface TasteTwinProfile {
  id: string;
  codename: string;
  matchPercent: number;
  sharedCategories: InterestCategory[];
  topPlatform: ContentFormat;
  favoriteGemId: string;
  activeAgo: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  subtitle: string;
  platform: string;
  format: ContentFormat;
  category: InterestCategory;
  dayGroup: AgendaDayGroup;
  timeLabel: string;
  durationMinutes: number;
  isLiveBroadcast: boolean;
  twinInterestCount: number;
  spoilerTag: string;
}

export interface AudioBriefSegment {
  id: string;
  timeRange: string;
  topic: string;
  text: string;
  sourceTitle: string;
}

export interface AudioBriefData {
  title: string;
  estimatedSeconds: number;
  segments: AudioBriefSegment[];
  generatedBy: string;
}
