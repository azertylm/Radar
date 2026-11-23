import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Heart,
  LayoutGrid,
  Moon,
  MoreHorizontal,
  Star,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface AlphabetteDoubleBarProps {
  appTitle?: string;
  appSubtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  isBigMode: boolean;
  onToggleBigMode: () => void;
  isSimpleMode: boolean;
  onToggleSimpleMode: () => void;
  onNavigateHome: () => void;
  onShowToast: (msg: string) => void;
}

interface SuiteAppItem {
  id: string;
  name: string;
  description: string;
  domain: string;
  url: string;
  isNew?: boolean;
}

const SUITE_APPS: SuiteAppItem[] = [
  {
    id: 'radar',
    name: 'Radar',
    description: 'Assistant culturel anti-FOMO multi-supports (TV, YouTube, Podcasts, Presse).',
    domain: 'radar.alphabette.fr',
    url: '#radar',
    isNew: true,
  },
  {
    id: 'infoperso',
    name: 'InfoPerso',
    description: 'Tableau de bord d’actualités et de veille personnelle sans algorithme opaque.',
    domain: 'infoperso.fr',
    url: 'https://infoperso.fr',
  },
  {
    id: 'cinephare',
    name: 'CinéPhare',
    description: 'Programme TV, replays cinéma et sorties salles triés par vos goûts.',
    domain: 'cinephare.fr',
    url: 'https://alphabette.fr',
    isNew: true,
  },
  {
    id: 'podpulse',
    name: 'PodPulse',
    description: 'Découverte de podcasts indépendants et moments forts horodatés.',
    domain: 'podpulse.fr',
    url: 'https://alphabette.fr',
    isNew: true,
  },
  {
    id: 'directscore',
    name: 'DirectScore',
    description: 'Agenda sportif en direct avec bouclier anti-spoiler intégré.',
    domain: 'directscore.fr',
    url: 'https://alphabette.fr',
  },
  {
    id: 'lecto',
    name: 'LectoPresse',
    description: 'Kiosque de synthèses presse en 3 points clés et lecture audio.',
    domain: 'lectopresse.fr',
    url: 'https://alphabette.fr',
  },
];

const FAVORITES_KEY = 'alphabette_suite_favorites_v1';
const PINNED_KEY = 'alphabette_radar_pinned_v1';
const DONOR_KEY = 'alphabette_donor_badge_v1';
const LANG_KEY = 'alphabette_lang_v1';

const DONATION_PRESETS = [
  { amount: 2, label: '2 €', desc: 'Un café' },
  { amount: 5, label: '5 €', desc: 'Serveur VPS' },
  { amount: 10, label: '10 €', desc: 'Soutien sans pub' },
  { amount: 20, label: '20 €', desc: 'Mécène Alphabette' },
];

export const AlphabetteDoubleBar: React.FC<AlphabetteDoubleBarProps> = ({
  appTitle = 'Radar',
  appSubtitle = 'ASSISTANT ANTI-FOMO',
  isDark,
  onToggleTheme,
  isBigMode,
  onToggleBigMode,
  isSimpleMode,
  onToggleSimpleMode,
  onNavigateHome,
  onShowToast,
}) => {
  const [favoriteAppIds, setFavoriteAppIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : ['radar', 'infoperso'];
    } catch {
      return ['radar', 'infoperso'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteAppIds));
    } catch {
      // ignore
    }
  }, [favoriteAppIds]);

  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem(PINNED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [selectedLang, setSelectedLang] = useState<string>(() => {
    try {
      return localStorage.getItem(LANG_KEY) || 'FR';
    } catch {
      return 'FR';
    }
  });

  // Modals & Dropdowns
  const [activeModal, setActiveModal] = useState<
    null | 'all_apps' | 'new_apps' | 'subscription' | 'donation' | 'install' | 'feedback' | 'language'
  >(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Voice synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Donation modal state
  const [donationAmount, setDonationAmount] = useState<number>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donationFrequency, setDonationFrequency] = useState<'once' | 'monthly'>('once');
  const [isDonor, setIsDonor] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DONOR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Feedback modal state
  const [feedbackText, setFeedbackText] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Clean up speechSynthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleFavoriteApp = (id: string) => {
    setFavoriteAppIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onShowToast('Synthèse vocale non disponible sur ce navigateur');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      onShowToast('Lecture à haute voix arrêtée');
      return;
    }

    window.speechSynthesis.cancel();
    const mainEl = document.querySelector('main');
    const rawText = mainEl?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 900) || '';
    const textToRead =
      rawText.length > 20
        ? `Radar, votre assistant anti-FOMO. ${rawText}`
        : 'Bienvenue sur Radar, votre assistant culturel anti-FOMO de la suite Alphabette.';

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.02;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
    onShowToast('Lecture à haute voix démarrée');
  };

  const handleTogglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      localStorage.setItem(PINNED_KEY, String(next));
    } catch {
      // ignore
    }
    setIsMenuOpen(false);
    onShowToast(next ? 'Radar épinglé à vos favoris ⭐' : 'Épingle retirée');
  };

  const handleConfirmDonation = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = customAmount ? Number(customAmount) || donationAmount : donationAmount;
    setIsDonor(true);
    try {
      localStorage.setItem(DONOR_KEY, 'true');
    } catch {
      // ignore
    }
    setActiveModal(null);
    onShowToast(`Merci pour votre don de ${amount} € ! Soutien Alphabette activé ❤️`);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackText('');
    setActiveModal(null);
    onShowToast('Merci pour votre avis ! Message transmis à l’équipe Alphabette.');
  };

  const newApps = SUITE_APPS.filter((a) => a.isNew);

  return (
    <>
      {/* =====================================================================
          DOUBLE BARRE ALPHABETTE FIXE (Dimensions en px fixes, isolée du mode BIG)
         ===================================================================== */}
      <header
        className="no-print sticky top-0 z-40 w-full select-none"
        style={{ fontSize: '16px', lineHeight: 'normal' }}
      >
        {/* 1. BARRE SUPÉRIEURE (Top Bar Écosystème) */}
        <div className="bg-[#182334] dark:bg-[#0b1220] text-white h-[46px] sm:h-[50px] px-[8px] sm:px-[16px] flex items-center justify-between gap-[4px] sm:gap-[8px] flex-nowrap">
          {/* Bloc de gauche */}
          <div className="flex items-center gap-[4px] sm:gap-[10px] min-w-0">
            {/* Logo + Nom (alphabette) */}
            <a
              href="https://alphabette.fr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Accueil Alphabette (alphabette.fr)"
              className="inline-flex items-center gap-[5px] sm:gap-[8px] shrink-0 focus-visible:outline-2 focus-visible:outline-[#f59e0b] rounded-[6px]"
            >
              <span className="w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-full bg-[#3355d1] text-white font-extrabold text-[15px] sm:text-[16px] flex items-center justify-center leading-none">
                a
              </span>
              <span className="font-bold lowercase tracking-tight text-[14.5px] sm:text-[17px] text-white whitespace-nowrap">
                alphabette
              </span>
            </a>

            {/* Bouton .eu */}
            <a
              href="https://alphabette.eu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Laboratoire Alphabette Europe (alphabette.eu)"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 text-white text-[12px] sm:text-[13px] font-semibold flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
            >
              .eu
            </a>

            {/* Bouton « Toutes les applis » */}
            <button
              type="button"
              onClick={() => setActiveModal('all_apps')}
              aria-label="Toutes les applis de la suite Alphabette"
              className="w-[34px] h-[34px] sm:w-auto sm:h-[36px] sm:px-[10px] rounded-full sm:rounded-[10px] bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center gap-[6px] shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
            >
              <LayoutGrid className="w-[17px] h-[17px] shrink-0" />
              <span className="hidden sm:inline text-[12.5px] font-semibold whitespace-nowrap">
                Toutes les applis
              </span>
            </button>

            {/* Bouton « NEW » */}
            <button
              type="button"
              onClick={() => setActiveModal('new_apps')}
              aria-label="Nouveautés de la suite Alphabette"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f59e0b]"
            >
              <span className="px-[4px] py-[2px] rounded-[4px] bg-gradient-to-br from-sky-200 to-sky-400 text-[#0f172a] text-[9px] font-extrabold uppercase tracking-tight leading-none">
                NEW
              </span>
            </button>
          </div>

          {/* Bloc de droite : Bouton Abonnement (bordure dorée) */}
          <div className="shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => setActiveModal('subscription')}
              aria-label="Informations sur l'abonnement Alphabette"
              className="h-[34px] sm:h-[36px] px-[9px] sm:px-[14px] rounded-full bg-white/10 hover:bg-white/15 border-[1.5px] border-[#f59e0b] inline-flex items-center gap-[4px] sm:gap-[6px] whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-white"
            >
              <Crown className="w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] text-[#f59e0b] shrink-0" />
              <span className="text-[12px] sm:text-[13.5px] font-bold text-[#fbbf24]">
                Abonnement
              </span>
            </button>
          </div>
        </div>

        {/* 2. BARRE INFÉRIEURE (Barre d'Application & Accessibilité) */}
        <div className="bg-[#ffffff] dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#334155] h-[54px] sm:h-[58px] px-[10px] sm:px-[16px] flex items-center justify-between gap-[6px] flex-nowrap">
          {/* Bloc de gauche : Titre + Sous-titre (<= 25 caractères) */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-left inline-flex items-center gap-[5px] min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4338ca] rounded-[4px]"
            >
              <span className="font-bold text-[#3f51b5] dark:text-white text-[14.5px] sm:text-[20px] tracking-tight truncate leading-tight">
                {appTitle}
              </span>
              {isPinned && (
                <Star className="w-[13px] h-[13px] text-[#f59e0b] fill-[#f59e0b] shrink-0" />
              )}
            </button>
            <span className="text-[9px] sm:text-[10.5px] uppercase tracking-[0.04em] text-[#64748b] dark:text-slate-400 font-semibold truncate leading-tight">
              {appSubtitle}
            </span>
          </div>

          {/* Bloc de droite : Strictly 5 buttons (Don, BIG, Mode Nuit/Jour, Voix, ...) */}
          <div className="flex items-center gap-[4px] sm:gap-[7px] shrink-0">
            {/* 1. Bouton Don */}
            <button
              type="button"
              onClick={() => setActiveModal('donation')}
              aria-label="Faire un don pour soutenir Alphabette"
              title={isDonor ? 'Merci pour votre soutien !' : 'Faire un don'}
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-[10px] sm:rounded-[11px] bg-[#db2777] hover:bg-[#be185d] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4338ca]"
            >
              <Heart className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] fill-current" />
            </button>

            {/* 2. Bouton BIG */}
            <button
              type="button"
              onClick={onToggleBigMode}
              aria-pressed={isBigMode}
              aria-label={isBigMode ? 'Désactiver le mode grand texte BIG' : 'Activer le mode grand texte BIG'}
              className={`h-[34px] sm:h-[38px] px-[8px] sm:px-[11px] rounded-[10px] sm:rounded-[11px] text-white inline-flex items-center gap-[4px] shrink-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f59e0b] ${
                isBigMode
                  ? 'bg-[#312e81] ring-2 ring-[#f59e0b]'
                  : 'bg-[#4338ca] hover:bg-[#3730a3]'
              }`}
            >
              <BarChart2 className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] shrink-0" />
              <span className="font-bold text-[12px] sm:text-[14px] tracking-tight leading-none">
                BIG
              </span>
            </button>

            {/* 3. Bouton Mode Nuit / Jour */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Passer en mode jour' : 'Passer en mode nuit'}
              className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#4338ca]"
            >
              {isDark ? (
                <Sun className="w-[17px] h-[17px] text-[#fbbf24]" />
              ) : (
                <Moon className="w-[17px] h-[17px] text-[#334155]" />
              )}
            </button>

            {/* 4. Bouton Lecture à haute voix */}
            <button
              type="button"
              onClick={handleToggleSpeech}
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? 'Arrêter la lecture à haute voix' : 'Lire la page à haute voix'}
              className={`w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#4338ca] ${
                isSpeaking
                  ? 'bg-[#047857] border-[#047857] text-white'
                  : 'bg-[#f1f5f9] dark:bg-[#1e293b] border-[#e2e8f0] dark:border-[#334155] text-[#334155] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-[17px] h-[17px]" />
              ) : (
                <Volume2 className="w-[17px] h-[17px]" />
              )}
            </button>

            {/* 5. Bouton Plus d'options (...) */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                aria-label="Plus d'options"
                className="w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-[#334155] dark:text-slate-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#4338ca]"
              >
                <MoreHorizontal className="w-[18px] h-[18px]" />
              </button>

              {/* Menu déroulant avec les 7 entrées exactes */}
              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label="Options supplémentaires"
                  className="absolute right-0 mt-[8px] w-[260px] rounded-[14px] bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-700 shadow-2xl py-[6px] z-50 text-[14px] text-slate-800 dark:text-slate-100"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleTogglePin}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>⭐ Épingler cette appli</span>
                    {isPinned && (
                      <span className="text-[11px] font-bold text-[#f59e0b]">Épinglée</span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveModal('subscription');
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>👤 Mon inscription</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleSimpleMode();
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>🧘 Mode simple</span>
                    {isSimpleMode && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        Actif
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveModal('install');
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>📱 Installer sur mon téléphone</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveModal('feedback');
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>💬 Donner mon avis</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.print();
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>🖨️ Imprimer</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setActiveModal('language');
                    }}
                    className="w-full px-[14px] py-[10px] text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>🌐 Langue</span>
                    <span className="px-[6px] py-[2px] rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold">
                      {selectedLang}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          MODALES AUTONOMES DE LA DOUBLE BARRE ALPHABETTE
         ===================================================================== */}

      {/* MODALE : TOUTES LES APPLIS */}
      {activeModal === 'all_apps' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-all-apps-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2
                id="modal-all-apps-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Toutes les applis Alphabette
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[65vh] overflow-y-auto">
              {SUITE_APPS.map((app) => {
                const isFav = favoriteAppIds.includes(app.id);
                return (
                  <div
                    key={app.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <a
                      href={app.url}
                      target={app.url.startsWith('http') ? '_blank' : undefined}
                      rel={app.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      onClick={() => {
                        if (!app.url.startsWith('http')) setActiveModal(null);
                      }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {app.name}
                        </span>
                        <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                          {app.domain}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {app.description}
                      </p>
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleFavoriteApp(app.id)}
                      aria-pressed={isFav}
                      aria-label={
                        isFav
                          ? `Retirer ${app.name} des favoris`
                          : `Ajouter ${app.name} aux favoris`
                      }
                      className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg shrink-0 cursor-pointer"
                    >
                      {isFav ? '⭐' : '☆'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : NOUVEAUTÉS (NEW) */}
      {activeModal === 'new_apps' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-new-apps-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2
                id="modal-new-apps-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Nouveautés Alphabette
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {newApps.map((app) => {
                const isFav = favoriteAppIds.includes(app.id);
                return (
                  <div
                    key={app.id}
                    className="px-5 py-4 flex items-center justify-between gap-3"
                  >
                    <a
                      href={app.url}
                      target={app.url.startsWith('http') ? '_blank' : undefined}
                      rel={app.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      onClick={() => {
                        if (!app.url.startsWith('http')) setActiveModal(null);
                      }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-sky-200 text-slate-900 text-[10px] font-extrabold">
                          NEW
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {app.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {app.description}
                      </p>
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleFavoriteApp(app.id)}
                      aria-pressed={isFav}
                      aria-label={
                        isFav
                          ? `Retirer ${app.name} des favoris`
                          : `Ajouter ${app.name} aux favoris`
                      }
                      className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg shrink-0 cursor-pointer"
                    >
                      {isFav ? '⭐' : '☆'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : ABONNEMENT ALPHABETTE (Lancement le 7 mai : 15 € / an ou 40 € / an) */}
      {activeModal === 'subscription' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-sub-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131722] border-2 border-[#f59e0b] shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[#f59e0b] flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="modal-sub-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Abonnement Alphabette
                  </h2>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                    Accès complet sans publicité
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2 text-sm text-slate-800 dark:text-slate-200">
              <p className="font-bold text-slate-900 dark:text-white">
                Lancement de l’abonnement payant le 7 mai
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>15 € / an</strong> pour une application au choix (ex. Radar)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    <strong>40 € / an</strong> pour toutes les applications de la suite Alphabette
                  </span>
                </li>
              </ul>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                En attendant le 7 mai, l’ensemble des fonctionnalités reste librement accessible sans création de compte.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : SYSTÈME DE DON ALPHABETTE */}
      {activeModal === 'donation' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-donation-title"
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 text-white border-2 border-[#db2777] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-current" />
                  <span>Soutien Alphabette · Sans publicité</span>
                </div>
                <h2 id="modal-donation-title" className="text-xl font-bold mt-1">
                  Soutenir le réseau Alphabette
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Vos dons financent l’hébergement VPS OVH et les 15 applications sans publicité.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDonation} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DONATION_PRESETS.map((preset) => {
                  const selected = !customAmount && donationAmount === preset.amount;
                  return (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => {
                        setDonationAmount(preset.amount);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer ${
                        selected
                          ? 'bg-[#db2777] border-rose-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-base font-extrabold font-mono">{preset.label}</div>
                      <div className="text-[11px] opacity-80">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="modal-custom-don" className="block text-xs text-slate-400 mb-1">
                    Montant libre (€)
                  </label>
                  <input
                    id="modal-custom-don"
                    type="number"
                    min={1}
                    max={500}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Ex: 15"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                  />
                </div>
                <div>
                  <span className="block text-xs text-slate-400 mb-1">Fréquence</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDonationFrequency('once')}
                      className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        donationFrequency === 'once' ? 'bg-[#db2777] text-white' : 'text-slate-400'
                      }`}
                    >
                      Ponctuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonationFrequency('monthly')}
                      className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        donationFrequency === 'monthly' ? 'bg-[#db2777] text-white' : 'text-slate-400'
                      }`}
                    >
                      Mensuel
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    Valider {customAmount || donationAmount} €{' '}
                    {donationFrequency === 'monthly' ? '/ mois' : ''}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE : INSTALLER SUR MON TÉLÉPHONE (PWA) */}
      {activeModal === 'install' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-install-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="modal-install-title" className="text-lg font-bold text-slate-900 dark:text-white">
                📱 Installer sur mon téléphone
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <p>
                <strong>Android (Chrome) :</strong> Appuyez sur le menu <strong>⋮</strong> en haut à droite puis sélectionnez <strong>« Ajouter à l’écran d’accueil »</strong>.
              </p>
              <p>
                <strong>iPhone / iPad (Safari) :</strong> Appuyez sur l’icône <strong>Partager</strong> en bas puis sur <strong>« Sur l’écran d’accueil »</strong>.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 text-xs font-bold cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : DONNER MON AVIS */}
      {activeModal === 'feedback' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-feedback-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleSubmitFeedback}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="modal-feedback-title" className="text-lg font-bold text-slate-900 dark:text-white">
                💬 Donner mon avis
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Une suggestion d'amélioration ou une nouvelle chaîne à ajouter à Radar ?"
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#4338ca] text-white text-xs font-bold cursor-pointer"
              >
                Envoyer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE : LANGUE */}
      {activeModal === 'language' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-lang-title"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="modal-lang-title" className="text-lg font-bold text-slate-900 dark:text-white">
                🌐 Langue de l’interface
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { code: 'FR', label: 'Français (France / Europe)' },
                { code: 'EN', label: 'English (International)' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setSelectedLang(lang.code);
                    try {
                      localStorage.setItem(LANG_KEY, lang.code);
                    } catch {
                      // ignore
                    }
                    setActiveModal(null);
                    onShowToast(`Langue active : ${lang.label}`);
                  }}
                  className={`w-full p-3 rounded-xl border text-left text-sm font-semibold flex items-center justify-between cursor-pointer ${
                    selectedLang === lang.code
                      ? 'bg-[#4338ca] text-white border-[#4338ca]'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>{lang.label}</span>
                  <span className="font-mono text-xs">{lang.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
