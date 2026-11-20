import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { RadarContentItem } from '../types/radar';
import { getDirectPlatformLink } from '../utils/radarEngine';
import { getUrgencyMeta } from './ContentCard';

interface ContentDetailModalProps {
  item: RadarContentItem | null;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClose: () => void;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  item,
  isSaved,
  onToggleSave,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const urgencyMeta = getUrgencyMeta(item.urgency, item.expiresInHours);
  const linkInfo = getDirectPlatformLink(item);

  const handleReadAloud = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${item.title}. Sur ${item.source}, par ${item.creator}. ${item.summary}`
      );
      utterance.lang = 'fr-FR';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#12151E] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className={`font-semibold ${urgencyMeta.textColor}`}>{urgencyMeta.label}</span>
            <span aria-hidden="true">·</span>
            <span>{item.format}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{item.durationMinutes} min</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu du contenu"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Preview / Image if available */}
        {item.imageUrl && (
          <div className="relative h-52 sm:h-60 w-full bg-slate-900 overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6">
              <div className="text-xs font-medium text-amber-300">
                {item.buzzReason || `Sélection Radar · ${item.source}`}
              </div>
            </div>
          </div>
        )}

        {/* Content body */}
        <div className="p-6 space-y-5">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              {item.category} · {item.source} · Par {item.creator}
            </div>
            <h2
              id="detail-modal-title"
              className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-snug"
            >
              {item.title}
            </h2>
          </div>

          {/* Direct Link Box with Copy & 1-Click Open */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Lien direct vers {linkInfo.platformLabel}
              </div>
              <a
                href={linkInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline truncate block"
              >
                {linkInfo.url}
              </a>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
              <a
                href={linkInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Ouvrir sur {linkInfo.platformLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            {item.summary}
          </p>

          {item.keyTakeaway && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>L’essentiel à retenir</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.keyTakeaway}</p>
            </div>
          )}

          {/* Compatibility metrics */}
          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Users className="w-4 h-4 text-amber-500" />
              <span className="tabular-nums">
                Recommandé par {item.twinCount} Jumeaux ({item.twinMatchPercent} % de compatibilité)
              </span>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#0E1118] border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReadAloud}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Écouter le résumé vocal</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleSave(item.id)}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{isSaved ? 'Sauvegardé' : 'Sauvegarder'}</span>
            </button>
          </div>

          <a
            href={linkInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold inline-flex items-center gap-2 transition-colors"
          >
            <span>Accéder au contenu ({linkInfo.domain})</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
