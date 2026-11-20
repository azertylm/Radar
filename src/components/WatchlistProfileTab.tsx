import React, { useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Compass,
  ExternalLink,
  Plus,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { ALL_INTERESTS, TASTE_TWINS_PROFILES } from '../data/mockRadarData';
import {
  ContentFormat,
  InterestCategory,
  RadarContentItem,
  TrustCircleMember,
} from '../types/radar';
import { getDirectPlatformLink, sortWatchlistItems } from '../utils/radarEngine';
import { ContentCard } from './ContentCard';

interface WatchlistProfileTabProps {
  allItems: RadarContentItem[];
  watchlistIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
  interests: InterestCategory[];
  platforms: ContentFormat[];
  onOpenOnboarding: () => void;
  trustCircle: TrustCircleMember[];
  onToggleCircleMember: (memberId: string) => void;
  onAddCustomCircleMember: (name: string, role: 'Ami' | 'Créateur' | 'Journaliste', specialty: InterestCategory) => void;
}

export const WatchlistProfileTab: React.FC<WatchlistProfileTabProps> = ({
  allItems,
  watchlistIds,
  onToggleSave,
  onOpenDetail,
  interests,
  platforms,
  onOpenOnboarding,
  trustCircle,
  onToggleCircleMember,
  onAddCustomCircleMember,
}) => {
  const [sortBy, setSortBy] = useState<'expiration' | 'format'>('expiration');
  const [formatFilter, setFormatFilter] = useState<ContentFormat | 'all'>('all');

  // Form state for adding a simulated friend or creator to Trust Circle
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Ami' | 'Créateur' | 'Journaliste'>('Ami');
  const [newMemberSpecialty, setNewMemberSpecialty] = useState<InterestCategory>('Cinéma');

  const savedItems = allItems.filter((item) => watchlistIds.includes(item.id));
  const filteredSaved = savedItems.filter((item) =>
    formatFilter === 'all' ? true : item.format === formatFilter
  );
  const sortedWatchlist = sortWatchlistItems(filteredSaved, sortBy);

  const expiringSavedItems = savedItems.filter(
    (item) => item.urgency === 'expiring' || item.urgency === 'live'
  );

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    onAddCustomCircleMember(newMemberName.trim(), newMemberRole, newMemberSpecialty);
    setNewMemberName('');
  };

  return (
    <div className="space-y-10">
      {/* 1. LA WATCHLIST UNIFIÉE ANTI-OUBLI */}
      <section aria-labelledby="watchlist-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="watchlist-heading"
              className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
            >
              <Bookmark className="w-5 h-5 text-amber-500" />
              <span>Ma Watchlist unifiée anti-oubli ({savedItems.length})</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Articles, replays TV, vidéos YouTube et podcasts sauvegardés au même endroit, classés avant qu’ils ne disparaissent.
            </p>
          </div>

          {/* Sort & Format Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              role="group"
              aria-label="Trier la Watchlist"
            >
              <button
                type="button"
                onClick={() => setSortBy('expiration')}
                aria-pressed={sortBy === 'expiration'}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'expiration'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Trier par urgence / expiration
              </button>
              <button
                type="button"
                onClick={() => setSortBy('format')}
                aria-pressed={sortBy === 'format'}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sortBy === 'format'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Trier par format
              </button>
            </div>

            <select
              aria-label="Filtrer la Watchlist par format"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as ContentFormat | 'all')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Tous les formats</option>
              <option value="TV/Replay">TV/Replay</option>
              <option value="YouTube">YouTube</option>
              <option value="Podcasts">Podcasts</option>
              <option value="Streaming">Streaming</option>
              <option value="Presse">Presse</option>
              <option value="Réseaux sociaux">Réseaux sociaux</option>
            </select>
          </div>
        </div>

        {/* Priority Expiration Alert Banner */}
        {expiringSavedItems.length > 0 && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Alerte prioritaire anti-disparition : {expiringSavedItems.length} contenu{expiringSavedItems.length > 1 ? 's' : ''} de votre liste expire{expiringSavedItems.length > 1 ? 'nt' : ''} bientôt
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  À voir en priorité :{' '}
                  {expiringSavedItems
                    .map((i) => `"${i.title}" (${i.expiresInHours ? `${i.expiresInHours}h restantes` : 'En direct'})`)
                    .join(' · ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenDetail(expiringSavedItems[0])}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Lancer le plus urgent
            </button>
          </div>
        )}

        {/* Watchlist Grid */}
        {sortedWatchlist.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Votre Watchlist est vide pour ce filtre
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cliquez sur « Sauvegarder » sur n’importe quel article, replay ou podcast du Radar pour le retrouver ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedWatchlist.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                isSaved={true}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. LE CERCLE DE CONFIANCE (Amis & Créateurs choisis) */}
      <section
        aria-labelledby="trust-circle-heading"
        className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="trust-circle-heading"
              className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
            >
              <UserCheck className="w-5 h-5 text-amber-500" />
              <span>Mon « Cercle de confiance » ({trustCircle.filter((m) => m.inCircle).length} membres actifs)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Choisissez les amis, journalistes et créateurs dont les recommandations alimentent l’onglet « Cercle de confiance » de votre Radar.
            </p>
          </div>
        </div>

        {/* Add Custom Friend / Creator Form */}
        <form
          onSubmit={handleAddMemberSubmit}
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-5">
            <label
              htmlFor="new-circle-name"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Ajouter un ami ou créateur au Cercle
            </label>
            <input
              id="new-circle-name"
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Ex: Julienorel, Marie Ciné..."
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="new-circle-role"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Rôle
            </label>
            <select
              id="new-circle-role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as 'Ami' | 'Créateur' | 'Journaliste')}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="Ami">Ami</option>
              <option value="Créateur">Créateur</option>
              <option value="Journaliste">Journaliste</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="new-circle-specialty"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Spécialité
            </label>
            <select
              id="new-circle-specialty"
              value={newMemberSpecialty}
              onChange={(e) => setNewMemberSpecialty(e.target.value as InterestCategory)}
              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {ALL_INTERESTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>
        </form>

        {/* Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {trustCircle.map((member) => (
            <div
              key={member.id}
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                member.inCircle
                  ? 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700'
                  : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-amber-500/20 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {member.avatarInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {member.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {member.role} · {member.specialty} · {member.handle}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    Dernier coup de cœur : « {member.recentPickTitle} »
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleCircleMember(member.id)}
                aria-pressed={member.inCircle}
                className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  member.inCircle
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {member.inCircle ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Dans mon Cercle</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Suivre</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LES JUMEAUX DE GOÛTS & MES PRÉFÉRENCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Jumeaux de goûts */}
        <section
          aria-labelledby="taste-twins-heading"
          className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <div>
            <h2
              id="taste-twins-heading"
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
            >
              <Users className="w-5 h-5 text-amber-500" />
              <span>Vos « Jumeaux de goûts » anonymes</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Profils partageant plus de 89 % de vos habitudes de visionnage et d’écoute sans aucun partage de données personnelles.
            </p>
          </div>

          <div className="space-y-3">
            {TASTE_TWINS_PROFILES.map((twin) => {
              const favItem = allItems.find((i) => i.id === twin.favoriteGemId) || allItems[0];
              return (
                <div
                  key={twin.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {twin.codename}
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        · {twin.matchPercent} % compatible
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Goûts communs : {twin.sharedCategories.join(', ')} · Support favori : {twin.topPlatform}
                    </div>
                    {favItem && (
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        Pépite recommandée : <span className="font-semibold">« {favItem.title} »</span>
                      </div>
                    )}
                  </div>

                  {favItem && (
                    <button
                      type="button"
                      onClick={() => onOpenDetail(favItem)}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Voir sa pépite
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Mes Goûts & Calibration locale */}
        <section
          aria-labelledby="my-tastes-heading"
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-5"
        >
          <div className="space-y-4">
            <div>
              <h2
                id="my-tastes-heading"
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
              >
                <Compass className="w-5 h-5 text-amber-500" />
                <span>Profil local & Goûts actifs</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sauvegardé automatiquement dans votre navigateur (`localStorage`) sans compte requis.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Thématiques suivies ({interests.length})
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {interests.join(' · ')}
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Supports activés ({platforms.length})
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {platforms.join(' · ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenOnboarding}
            className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Modifier mes goûts & plateformes</span>
          </button>
        </section>
      </div>
    </div>
  );
};
