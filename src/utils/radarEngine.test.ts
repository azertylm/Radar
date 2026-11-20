import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_RADAR_ITEMS } from '../data/mockRadarData';
import {
  buildCatchupPlaylist,
  buildPartyModeSelection,
  filterAndRankFeed,
  getDirectPlatformLink,
  getSundayMagazineEdition,
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

test('filterAndRankFeed supports Pépites cachées (hidden_gems) source mode and Accessible Now filter', () => {
  const hiddenGems = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Tech/IA', 'Cinéma', 'Gaming', 'Culture', 'Musique', 'Sciences'],
    platforms: ['YouTube', 'Podcasts', 'Presse', 'Streaming'],
    sourceMode: 'hidden_gems',
    circleMemberIds: [],
    urgencyFilter: 'all',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 0,
  });

  assert.ok(hiddenGems.length >= 4, 'Should return at least 4 hidden gems');
  assert.ok(
    hiddenGems.every((item) => item.isHiddenGem === true),
    'Every item in hidden_gems mode must be marked isHiddenGem'
  );

  const freeOnly = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Tech/IA', 'Cinéma', 'Actualités'],
    platforms: ['TV/Replay', 'Streaming', 'Presse'],
    sourceMode: 'for_you',
    circleMemberIds: [],
    urgencyFilter: 'all',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 20,
    onlyAccessibleNow: true,
    ownedSubscriptions: ['free'],
  });

  assert.ok(
    freeOnly.every((item) => item.isFree),
    'When onlyAccessibleNow is true with only free subscription, all items must be free'
  );
});

test('filterAndRankFeed enforces Universal Mute and tags Anti-Spoiler items', () => {
  const feed = filterAndRankFeed(INITIAL_RADAR_ITEMS, {
    interests: ['Sport', 'Cinéma', 'Tech/IA'],
    platforms: ['TV/Replay', 'Réseaux sociaux', 'Streaming'],
    sourceMode: 'for_you',
    circleMemberIds: [],
    urgencyFilter: 'all',
    formatFilter: 'all',
    moodFilter: 'all',
    outOfBubblePercent: 0,
    muteRules: [{ id: 'm1', keyword: 'Mercato rumeurs', duration: '7d', createdAtLabel: '7j' }],
    spoilerRules: [{ id: 's1', keyword: 'Le Bureau des Ombres', seen: false }],
  });

  assert.ok(
    !feed.some((i) => i.title.includes('Mercato rumeurs')),
    'Muted item must be completely removed from feed'
  );

  const bureauItem = feed.find((i) => i.title.includes('Le Bureau des Ombres'));
  assert.ok(bureauItem, 'Le Bureau des Ombres should be in feed');
  assert.equal(
    bureauItem.matchedSpoilerKeyword,
    'Le Bureau des Ombres',
    'Item matching active spoiler rule must carry matchedSpoilerKeyword'
  );
});

test('buildCatchupPlaylist and getSundayMagazineEdition return exact targets', () => {
  const durations = [5, 15, 30, 60] as const;
  for (const target of durations) {
    const result = buildCatchupPlaylist(INITIAL_RADAR_ITEMS, target, ['Tech/IA', 'Cinéma', 'Humour']);
    assert.equal(result.totalMinutes, target, `Playlist total duration should match ${target} min`);
  }

  const magazine = getSundayMagazineEdition(INITIAL_RADAR_ITEMS, ['Tech/IA', 'Cinéma', 'Culture']);
  assert.equal(magazine.length, 5, 'Sunday Magazine edition must compile 5 essential gems');
});

test('buildPartyModeSelection computes duo compatibility and consensus picks', () => {
  const party = buildPartyModeSelection(
    INITIAL_RADAR_ITEMS,
    ['Cinéma', 'Tech/IA'],
    ['Cinéma', 'Humour']
  );
  assert.ok(party.recommendations.length >= 3, 'Should return consensus recommendations');
  assert.ok(party.overallDuoCompatibility >= 80, 'Should compute valid duo compatibility score');
});

test('getDirectPlatformLink provides valid https URLs and highlight timestamp URLs', () => {
  for (const item of INITIAL_RADAR_ITEMS) {
    const linkInfo = getDirectPlatformLink({
      ...item,
      highlightSeconds: item.highlightMoment?.seconds,
    });
    assert.ok(linkInfo.url.startsWith('https://'), `URL for ${item.id} must start with https://`);
    if (item.highlightMoment) {
      assert.ok(
        linkInfo.highlightUrl.includes(`t=${item.highlightMoment.seconds}s`),
        'Highlight URL must include timestamp parameter'
      );
    }
  }
});
