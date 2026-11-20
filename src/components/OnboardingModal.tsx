import React from 'react';
import { Check, Compass, Sparkles, X } from 'lucide-react';
import { ALL_INTERESTS, ALL_PLATFORMS } from '../data/mockRadarData';
import { ContentFormat, InterestCategory } from '../types/radar';

interface OnboardingModalProps {
  isOpen: boolean;
  interests: InterestCategory[];
  platforms: ContentFormat[];
  onToggleInterest: (category: InterestCategory) => void;
  onTogglePlatform: (platform: ContentFormat) => void;
  onComplete: () => void;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  interests,
  platforms,
  onToggleInterest,
  onTogglePlatform,
  onComplete,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="onboarding-modal-title"
                className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Calibrez votre Radar personnel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sans création de compte · Sauvegardé instantanément sur cet appareil
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer la configuration des goûts"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Step 1: Centres d'intérêt */}
          <section aria-labelledby="onboarding-interests-heading">
            <div className="flex items-baseline justify-between mb-3">
              <h3
                id="onboarding-interests-heading"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                01. Vos centres d’intérêt prioritaires
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {interests.length} sélectionné{interests.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Choisissez les thématiques pour lesquelles vous ne voulez manquer aucun direct, replay ou pépite.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ALL_INTERESTS.map((item) => {
                const isSelected = interests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleInterest(item.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[56px] p-3.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-sm'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{item.label}</div>
                      <div
                        className={`text-xs mt-0.5 line-clamp-1 ${
                          isSelected
                            ? 'text-slate-300 dark:text-slate-900/80'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-white/20 dark:bg-slate-950/20'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Plateformes utilisées */}
          <section aria-labelledby="onboarding-platforms-heading">
            <div className="flex items-baseline justify-between mb-3">
              <h3
                id="onboarding-platforms-heading"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                02. Vos supports & plateformes habituels
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {platforms.length} actif{platforms.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_PLATFORMS.map((plat) => {
                const isSelected = platforms.includes(plat.id);
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => onTogglePlatform(plat.id)}
                    aria-pressed={isSelected}
                    className={`min-h-[54px] px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{plat.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {plat.examples}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-[#0E1118] border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vos Jumeaux de goûts sont recalculés en temps réel selon cette sélection.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Appliquer à mon Radar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
