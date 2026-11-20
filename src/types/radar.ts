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

export type FomoUrgency = 'live' | 'expiring' | 'anytime';

export type MoodFilter = 'all' | 'laugh' | 'learn' | 'background' | 'serious';

export type FeedSourceMode = 'for_you' | 'taste_twins' | 'trust_circle';

export type CatchupDuration = 5 | 15 | 30 | 60;

export type AgendaDayGroup = 'today' | 'tomorrow' | 'week';

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
  expiresInHours?: number; // For 'expiring' items or replays
  liveViewers?: number; // For 'live' items
  mood: Exclude<MoodFilter, 'all'>;
  twinMatchPercent: number;
  twinCount: number;
  recommendedByCircleIds: string[];
  summary: string;
  keyTakeaway?: string;
  publishedAt: string;
  imageUrl?: string;
  isBuzzPeak?: boolean;
  buzzReason?: string;
  actionLabel?: string;
  externalUrl?: string;
  // Computed dynamically by radarEngine
  isOutOfBubble?: boolean;
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

export interface UserPreferences {
  hasCompletedOnboarding: boolean;
  interests: InterestCategory[];
  platforms: ContentFormat[];
  outOfBubblePercent: number; // 0 to 50
  watchlistIds: string[];
  remindedEventIds: string[];
  circleMemberIds: string[];
  seenItemIds: string[];
}
