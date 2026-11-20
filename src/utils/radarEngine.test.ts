import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_RADAR_ITEMS } from '../data/mockRadarData';
import {
  buildCatchupPlaylist,
  filterAndRankFeed,
  getDirectPlatformLink,
  sortWatchlistItems,
} from './radarEngine';

test('filterAndRankFeed filters strictly by FOMO urgency and format', () => {
  const liveOnly = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Tech/IA', 'Gaming', 'Musique', 'Sciences'],
    platforms: ['YouTube', 'Streaming', 'Podcasts', 'TV/Replay'],
    sourceMode: 'for_you',
    circleMemberIds: ['circle-1', 'circle-2'],
    urgencyFilter: 'live',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 0,
  });

  assert.ok(liveOnly.length > 0, 'Should return live items');
  assert.ok(
    liveOnly.every((item) => item.urgency === 'live'),
    'Every item must have live urgency'
  );
});

test('filterAndRankFeed injects Hors de ma bulle items when outOfBubblePercent > 0', () => {
  const withoutOutBubble = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Tech/IA'],
    platforms: ['YouTube', 'Presse'],
    sourceMode: 'for_you',
    circleMemberIds: [],
    urgencyFilter: 'all',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 0,
  });

  assert.ok(
    withoutOutBubble.every((i) => i.category === 'Tech/IA' && !i.isOutOfBubble),
    'At 0% out-of-bubble, only selected interest items appear'
  );

  const withOutBubble = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Tech/IA'],
    platforms: ['YouTube', 'Presse'],
    sourceMode: 'for_you',
    circleMemberIds: [],
    urgencyFilter: 'all',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 40,
  });

  const injected = withOutBubble.filter((i) => i.isOutOfBubble);
  assert.ok(injected.length >= 1, 'At 40% out-of-bubble, outside-interest discovery items are injected');
  assert.ok(
    injected.every((i) => i.category !== 'Tech/IA'),
    'Injected discovery items belong to categories outside user bubble'
  );
});

test('buildCatchupPlaylist builds exact duration playlists for 5, 15, 30, and 60 minutes', () => {
  const durations = [5, 15, 30, 60] as const;
  for (const target of durations) {
    const result = buildCatchupPlaylist(INITIAL_RADAR_ITEMS, target, ['Tech/IA', 'Cinéma', 'Humour']);
    assert.equal(
      result.totalMinutes,
      target,
      `Playlist total duration should match exact ${target} min target`
    );
    assert.ok(result.playlist.length >= 1, `Playlist for ${target} min should not be empty`);
  }
});

test('sortWatchlistItems prioritizes live and expiring items first', () => {
  const sample = INITIAL_RADAR_ITEMS.slice(0, 8);
  const sorted = sortWatchlistItems(sample, 'expiration');
  assert.ok(
    sorted[0].urgency === 'live' || sorted[0].urgency === 'expiring',
    'First item in expiration sort must be live or expiring soon'
  );
});

test('getDirectPlatformLink provides a direct valid https URL for every item', () => {
  for (const item of INITIAL_RADAR_ITEMS) {
    const linkInfo = getDirectPlatformLink(item);
    assert.ok(linkInfo.url.startsWith('https://'), `URL for ${item.id} must start with https://`);
    assert.ok(linkInfo.platformLabel.length > 0, `Platform label for ${item.id} must not be empty`);
  }
});

