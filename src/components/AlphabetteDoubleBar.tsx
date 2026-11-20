import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Globe,
  Grid,
  Headphones,
  Heart,
  Moon,
  Radio,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from 'lucide-react';

export type ActiveTab = 'radar' | 'explorer' | 'catchup' | 'agenda' | 'watchlist';
export type BigModeLevel = 'normal' | 'big' | 'xbig';

interface AlphabetteDoubleBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  watchlistCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenOnboarding: () => void;
  onShowToast: (msg: string) => void;
}

const BIG_MODE_STORAGE_KEY = 'alphabette_big_mode_v1';
const DONOR_STORAGE_KEY = 'alphabette_donor_badge_v1';

const BIG_LEVELS: Record<
  BigModeLevel,
  { label: string; badge: string; rootFontSize: string; next: BigModeLevel }
> = {
  normal: {
    label: 'BIG',
    badge: '100%',
    rootFontSize: '100%',
    next: 'big',
  },
  big: {
    label: 'BIG +',
    badge: '120%',
    rootFontSize: '118%',
    next: 'xbig',
  },
  xbig: {
    label: 'BIG MAX',
    badge: '135%',
    rootFontSize: '132%',
    next: 'normal',
  },
};

const ALPHABETTE_ECOSYSTEM_APPS = [
  {
    id: 'alphabette',
    name: 'Alphabette Portail',
    domain: 'alphabette.fr',
    url: 'https://alphabette.fr',
    tag: 'Portail Central',
    active: false,
  },
  {
    id: 'infoperso',
    name: 'InfoPerso',
    domain: 'infoperso.fr',
    url: 'https://infoperso.fr',
    tag: 'Actualités & Veille',
    active: false,
  },
  {
    id: 'radar',
    name: 'Radar Anti-FOMO',
    domain: 'radar.alphabette.fr',
    url: '#radar',
    tag: 'Application active',
    active: true,
  },
  {
    id: 'cinephare',
    name: 'CinéPhare',
    domain: 'cinephare.fr',
    url: 'https://alphabette.fr',
    tag: 'Cinéma & Séries',
    active: false,
  },
  {
    id: 'podpulse',
    name: 'PodPulse',
    domain: 'podpulse.fr',
    url: 'https://alphabette.fr',
    tag: 'Podcasts & Radio',
    active: false,
  },
  {
    id: 'directscore',
    name: 'DirectScore',
    domain: 'directscore.fr',
    url: 'https://alphabette.fr',
    tag: 'Sport & Directs',
    active: false,
  },
];

const DONATION_PRESETS = [
  { amount: 2, label: '2 €', desc: 'Un café pour le développeur' },
  { amount: 5, label: '5 €', desc: 'Participation serveur VPS OVH' },
  { amount: 10, label: '10 €', desc: 'Soutien complet sans pub' },
  { amount: 20, label: '20 €', desc: 'Mécène du réseau Alphabette' },
];

export const AlphabetteDoubleBar: React.FC<AlphabetteDoubleBarProps> = ({
  activeTab,
  onSelectTab,
  watchlistCount,
  isDark,
  onToggleTheme,
  onOpenOnboarding,
  onShowToast,
}) => {
  // 1. Bouton BIG (Grand Texte / Accessibilité instantanée)
  const [bigLevel, setBigLevel] = useState<BigModeLevel>(() => {
    try {
      const saved = localStorage.getItem(BIG_MODE_STORAGE_KEY) as BigModeLevel | null;
      return saved && BIG_LEVELS[saved] ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });

  useEffect(() => {
    const config = BIG_LEVELS[bigLevel] || BIG_LEVELS.normal;
    document.documentElement.style.fontSize = config.rootFontSize;
    try {
      localStorage.setItem(BIG_MODE_STORAGE_KEY, bigLevel);
    } catch {
      // ignore storage errors
    }
  }, [bigLevel]);

  const handleCycleBigMode = () => {
    const nextLevel = BIG_LEVELS[bigLevel].next;
    setBigLevel(nextLevel);
    if (nextLevel === 'big') {
      onShowToast('Mode BIG activé (Affichage agrandi à 120 %)');
    } else if (nextLevel === 'xbig') {
      onShowToast('Mode BIG MAX activé (Affichage très grand à 135 %)');
    } else {
      onShowToast('Taille d’affichage standard rétablie (100 %)');
    }
  };

  // 2. Système de Don Alphabette
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donationFrequency, setDonationFrequency] = useState<'once' | 'monthly'>('once');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'kofi'>('card');
  const [donorMessage, setDonorMessage] = useState<string>('');
  const [isDonor, setIsDonor] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DONOR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [serverGoalPercent, setServerGoalPercent] = useState<number>(78);

  const handleConfirmDonation = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEuros = customAmount ? Number(customAmount) || donationAmount : donationAmount;
    setIsDonor(true);
    setServerGoalPercent((prev) => Math.min(100, prev + Math.max(2, Math.round(finalEuros / 2))));
    try {
      localStorage.setItem(DONOR_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setIsDonationOpen(false);
    onShowToast(
      `Merci infiniment pour votre don de ${finalEuros} € ! Votre badge Soutien Alphabette est actif ❤️`
    );
  };

  // 3. Lecture vocale rapide (TTS) dans la barre
  const [isReadingPage, setIsReadingPage] = useState(false);

  const handleToggleQuickVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('La synthèse vocale n’est pas disponible sur ce navigateur');
      return;
    }
    if (isReadingPage) {
      window.speechSynthesis.cancel();
      setIsReadingPage(false);
      onShowToast('Lecture vocale arrêtée');
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        'Bienvenue sur Radar, l’assistant anti-FOMO du réseau Alphabette. Utilisez le bouton BIG en haut pour agrandir toute l’interface, ou cliquez sur un contenu pour l’ouvrir directement.'
      );
      utterance.lang = 'fr-FR';
      utterance.onend = () => setIsReadingPage(false);
      window.speechSynthesis.speak(utterance);
      setIsReadingPage(true);
      onShowToast('Lecture vocale de l’assistant activée');
    }
  };

  // 4. Partage rapide & Portail Écosystème
  const [isEcosystemOpen, setIsEcosystemOpen] = useState(false);

  const handleShareApp = async () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        onShowToast('Lien de l’application copié dans le presse-papiers !');
        return;
      } catch {
        // fallback
      }
    }
    onShowToast('Partagez Radar · Écosystème Alphabette (alphabette.fr)');
  };

  return (
    <header className="sticky top-0 z-30 shadow-sm">
      {/* =====================================================================
          BARRE 1 : LA BARRE SUPÉRIEURE ALPHABETTE (Portail + Bouton BIG + Don + Outils)
         ===================================================================== */}
      <div className="bg-slate-950 text-white border-b border-slate-800 px-3 sm:px-8 min-h-[46px] py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Gauche : Identité Alphabette + infoperso.fr + Sélecteur des 15 sites */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://alphabette.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs tracking-wide transition-colors whitespace-nowrap shrink-0"
            title="Ouvrir le portail Alphabette (alphabette.fr)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono uppercase tracking-wider">
              ALPHABETTE<span className="text-amber-400">.FR</span>
            </span>
          </a>

          <a
            href="https://infoperso.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-800/80 text-slate-200 hover:text-amber-400 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>infoperso.fr</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            type="button"
            onClick={() => {
              setIsEcosystemOpen((prev) => !prev);
              setIsDonationOpen(false);
            }}
            aria-expanded={isEcosystemOpen}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Les 15 sites Alphabette</span>
            <span className="md:hidden">Sites .fr</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Droite : BOUTON BIG + SYSTÈME DE DON + AUDIO + THÈME + PARTAGER */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* LE BOUTON BIG (Agrandissement immédiat de l'interface 100% -> 120% -> 135%) */}
          <button
            type="button"
            onClick={handleCycleBigMode}
            aria-pressed={bigLevel !== 'normal'}
            title="Agrandir toute l'interface et les textes (Mode BIG)"
            className={`min-h-[34px] px-3 py-1 rounded-lg font-extrabold text-xs inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              bigLevel !== 'normal'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm scale-105'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/50'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{BIG_LEVELS[bigLevel].label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                bigLevel !== 'normal'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {BIG_LEVELS[bigLevel].badge}
            </span>
          </button>

          {/* LE BOUTON SYSTÈME DE DON ALPHABETTE */}
          <button
            type="button"
            onClick={() => {
              setIsDonationOpen((prev) => !prev);
              setIsEcosystemOpen(false);
            }}
            aria-expanded={isDonationOpen}
            className={`min-h-[34px] px-3 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
              isDonationOpen
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                : isDonor
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50'
                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-xs'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>{isDonor ? 'Donateur ❤️' : 'Faire un don'}</span>
          </button>

          {/* BOUTON AUDIO / LECTURE VOCALE */}
          <button
            type="button"
            onClick={handleToggleQuickVoice}
            aria-pressed={isReadingPage}
            title="Lire l'aide vocale à haute voix"
            className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              isReadingPage
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
            }`}
          >
            {isReadingPage ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden lg:inline">{isReadingPage ? 'Stop voix' : 'Voix'}</span>
          </button>

          {/* BOUTON PARTAGER */}
          <button
            type="button"
            onClick={handleShareApp}
            title="Partager l'application"
            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Partager</span>
          </button>

          {/* BOUTON THÈME CLAIR / ONYX */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre Onyx'}
            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Clair</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Nuit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          PANNEAU DÉPLIANT : SYSTÈME DE DON ALPHABETTE (100% Indépendant & Sans Pub)
         ===================================================================== */}
      {isDonationOpen && (
        <div className="bg-slate-900 text-white border-b-2 border-rose-500 px-4 sm:px-8 py-5 shadow-xl">
          <div className="max-w-5xl mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>Système de Don Alphabette · 100 % Indépendant & Sans Publicité</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Soutenez l’hébergement du réseau Alphabette (alphabette.fr & infoperso.fr)
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                  Toutes nos applications web et mobiles sont gratuites, sans traçage publicitaire et utilisables sans compte obligatoire. Vos dons financent directement le serveur VPS OVH et les 15 noms de domaine .fr.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDonationOpen(false)}
                aria-label="Fermer le système de don"
                className="self-end sm:self-start p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Jauge transparente d'hébergement serveur */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Objectif frais serveur VPS OVH & Domaines .fr du mois :
                </span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {serverGoalPercent} % financé grâce à la communauté
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${serverGoalPercent}%` }}
                />
              </div>
            </div>

            {/* Formulaire de don rapide */}
            <form onSubmit={handleConfirmDonation} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Paliers de don */}
                <div className="lg:col-span-7 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    1. Choisissez votre coup de pouce
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DONATION_PRESETS.map((preset) => {
                      const isSelected = !customAmount && donationAmount === preset.amount;
                      return (
                        <button
                          key={preset.amount}
                          type="button"
                          onClick={() => {
                            setDonationAmount(preset.amount);
                            setCustomAmount('');
                          }}
                          aria-pressed={isSelected}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-lg font-extrabold font-mono tabular-nums">
                            {preset.label}
                          </span>
                          <span
                            className={`text-[11px] mt-1 leading-tight ${
                              isSelected ? 'text-rose-100' : 'text-slate-400'
                            }`}
                          >
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fréquence, Montant libre & Moyen de paiement */}
                <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="custom-donation-input"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-400"
                    >
                      Montant libre (€)
                    </label>
                    <input
                      id="custom-donation-input"
                      type="number"
                      min={1}
                      max={500}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="Autre montant..."
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Fréquence
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDonationFrequency('once')}
                        className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                          donationFrequency === 'once'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Ponctuel
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonationFrequency('monthly')}
                        className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                          donationFrequency === 'monthly'
                            ? 'bg-rose-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mensuel
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      2. Mode de règlement sécurisé
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'card', label: 'Carte / Stripe' },
                        { id: 'paypal', label: 'PayPal' },
                        { id: 'kofi', label: 'Tipeee / Ko-fi' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as 'card' | 'paypal' | 'kofi')}
                          className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                            paymentMethod === m.id
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={donorMessage}
                  onChange={(e) => setDonorMessage(e.target.value)}
                  placeholder="Un petit mot d’encouragement pour l’équipe Alphabette (optionnel)..."
                  className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />

                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  <span>
                    Valider mon don de {customAmount || donationAmount} €{' '}
                    {donationFrequency === 'monthly' ? '/ mois' : ''}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TIROIR ÉCOSYSTÈME ALPHABETTE (Les 15 sites .fr & infoperso.fr)
         ===================================================================== */}
      {isEcosystemOpen && (
        <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-4">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Écosystème Alphabette (15 domaines .fr)
                </span>
                <span className="text-xs text-slate-400">
                  · Accès direct aux applications web & Android du réseau
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEcosystemOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="Fermer le portail Alphabette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {ALPHABETTE_ECOSYSTEM_APPS.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  target={app.url.startsWith('http') ? '_blank' : undefined}
                  rel={app.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  onClick={() => {
                    if (!app.url.startsWith('http')) setIsEcosystemOpen(false);
                  }}
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 ${
                    app.active
                      ? 'bg-amber-500/15 border-amber-500/60 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">{app.name}</span>
                    {app.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 truncate">
                    {app.domain}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">{app.tag}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          BARRE 2 : LA BARRE DE NAVIGATION DE L'APPLICATION RADAR
         ===================================================================== */}
      <div className="min-h-[54px] bg-white/95 dark:bg-[#0E1118]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-4">
        {/* Zone 1 : Logo Radar + Badge Alphabette */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#radar"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('radar');
            }}
            className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap font-display"
          >
            <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-sm">
              R
            </span>
            <span>Radar</span>
          </a>

          {isDonor && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
              <Check className="w-3 h-3" />
              <span>Mécène Alphabette</span>
            </span>
          )}
        </div>

        {/* Zone 2 : Les 5 Onglets de Navigation */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => onSelectTab('radar')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'radar'
                ? 'text-slate-900 dark:text-white border-amber-500 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-amber-500" />
            <span>Radar</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('explorer')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'explorer'
                ? 'text-slate-900 dark:text-white border-amber-500 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('catchup')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'catchup'
                ? 'text-slate-900 dark:text-white border-amber-500 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Headphones className="w-4 h-4 text-amber-500" />
            <span>Rattrapage</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('agenda')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'agenda'
                ? 'text-slate-900 dark:text-white border-amber-500 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('watchlist')}
            className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 inline-flex items-center gap-1.5 ${
              activeTab === 'watchlist'
                ? 'text-slate-900 dark:text-white border-amber-500 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            <span>Mon Espace ({watchlistCount})</span>
          </button>
        </nav>

        {/* Zone 3 : Accès rapide Calibration Goûts & Abonnements */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Mes Goûts & Abonnements</span>
          </button>
        </div>
      </div>
    </header>
  );
};
