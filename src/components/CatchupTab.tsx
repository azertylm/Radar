import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  AudioBriefData,
  CatchupDuration,
  ContentFormat,
  InterestCategory,
  RadarContentItem,
} from '../types/radar';
import { buildCatchupPlaylist } from '../utils/radarEngine';
import { ContentCard } from './ContentCard';

interface CatchupTabProps {
  allItems: RadarContentItem[];
  interests: InterestCategory[];
  platforms: ContentFormat[];
  watchlistIds: string[];
  onToggleSave: (id: string) => void;
  onOpenDetail: (item: RadarContentItem) => void;
}

const TIME_SLOTS: Array<{ minutes: CatchupDuration; label: string; subtitle: string }> = [
  { minutes: 5, label: '5 min', subtitle: 'Pause café · L’essentiel flash' },
  { minutes: 15, label: '15 min', subtitle: 'Trajet court · Mix actu & vidéo' },
  { minutes: 30, label: '30 min', subtitle: 'Pause déjeuner · Décryptage complet' },
  { minutes: 60, label: '1 heure', subtitle: 'Soirée · Immersion multi-supports' },
];

export const CatchupTab: React.FC<CatchupTabProps> = ({
  allItems,
  interests,
  platforms,
  watchlistIds,
  onToggleSave,
  onOpenDetail,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<CatchupDuration>(15);
  const [audioBrief, setAudioBrief] = useState<AudioBriefData | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [speechRate, setSpeechRate] = useState<number>(1.05);

  const timerRef = useRef<number | null>(null);

  const catchupSelection = buildCatchupPlaylist(allItems, selectedSlot, interests);

  // Clean up speechSynthesis and interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSegment = (brief: AudioBriefData, index: number, rate: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const seg = brief.segments[index];
    if (!seg) return;

    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.lang = 'fr-FR';
    utterance.rate = rate;

    utterance.onend = () => {
      if (index + 1 < brief.segments.length) {
        setActiveSegmentIndex(index + 1);
        speakSegment(brief, index + 1, rate);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Synchronized timer for progress bar & segment highlighting
  useEffect(() => {
    if (!isPlaying || !audioBrief) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const totalSec = audioBrief.estimatedSeconds || 180;
    const segCount = audioBrief.segments.length;
    const secPerSegment = Math.max(10, Math.floor(totalSec / segCount));

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= totalSec) {
          setIsPlaying(false);
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          return totalSec;
        }
        const computedSegIndex = Math.min(
          segCount - 1,
          Math.floor(next / secPerSegment)
        );
        setActiveSegmentIndex(computedSegIndex);
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, audioBrief]);

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    setIsPlaying(false);
    setElapsedSeconds(0);
    setActiveSegmentIndex(0);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      const topUnseen = allItems.slice(0, 5).map((item) => ({
        title: item.title,
        source: item.source,
        category: item.category,
        summary: item.summary,
        urgency: item.urgency,
      }));

      const res = await fetch('/api/gemini/audio-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          platforms,
          unseenItems: topUnseen,
        }),
      });
      const data: AudioBriefData = await res.json();
      setAudioBrief(data);
    } catch (err) {
      console.error('Error generating audio brief:', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleTogglePlayPause = () => {
    if (!audioBrief) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      const totalSec = audioBrief.estimatedSeconds || 180;
      const startIndex = elapsedSeconds >= totalSec ? 0 : activeSegmentIndex;
      if (elapsedSeconds >= totalSec) {
        setElapsedSeconds(0);
        setActiveSegmentIndex(0);
      }
      setIsPlaying(true);
      speakSegment(audioBrief, startIndex, speechRate);
    }
  };

  const handleRestartAudio = () => {
    if (!audioBrief) return;
    setElapsedSeconds(0);
    setActiveSegmentIndex(0);
    setIsPlaying(true);
    speakSegment(audioBrief, 0, speechRate);
  };

  const handleJumpToSegment = (index: number) => {
    if (!audioBrief) return;
    const totalSec = audioBrief.estimatedSeconds || 180;
    const secPerSegment = Math.floor(totalSec / audioBrief.segments.length);
    setActiveSegmentIndex(index);
    setElapsedSeconds(index * secPerSegment);
    setIsPlaying(true);
    speakSegment(audioBrief, index, speechRate);
  };

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const totalBriefSeconds = audioBrief?.estimatedSeconds || 180;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalBriefSeconds) * 100));

  return (
    <div className="space-y-8">
      {/* 1. LE BRIEF AUDIO GÉNÉRÉ PAR IA (3 MIN) */}
      <section
        aria-labelledby="audio-brief-heading"
        className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-6 sm:p-7 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Headphones className="w-4 h-4" />
              <span>Synthèse vocale personnalisée · Web Speech API (FR)</span>
            </div>
            <h2
              id="audio-brief-heading"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white"
            >
              Le « Brief Audio » anti-FOMO du jour
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Pas le temps de tout lire ? Générez un résumé radio sur mesure de vos contenus manqués du jour selon vos thèmes ({interests.slice(0, 3).join(', ')}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief}
            className="min-h-[48px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGeneratingBrief ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rédaction du script en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Générer mon Brief Audio du jour (3 min)</span>
              </>
            )}
          </button>
        </div>

        {/* Audio Player & Synchronized Transcript */}
        {audioBrief && (
          <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-5 space-y-5">
            {/* Player Controls Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlayPause}
                  aria-label={isPlaying ? 'Mettre en pause le Brief Audio' : 'Écouter le Brief Audio'}
                  className="w-12 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRestartAudio}
                  aria-label="Recommencer le Brief Audio au début"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {audioBrief.title}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Segment {activeSegmentIndex + 1}/{audioBrief.segments.length} ·{' '}
                      {audioBrief.segments[activeSegmentIndex]?.topic}
                    </span>
                  </div>
                </div>
              </div>

              {/* Speed & Time counter */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                  {[1, 1.15, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setSpeechRate(rate);
                        if (isPlaying) {
                          speakSegment(audioBrief, activeSegmentIndex, rate);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-mono tabular-nums cursor-pointer ${
                        speechRate === rate
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <div className="text-xs font-mono tabular-nums text-slate-300">
                  {formatMMSS(elapsedSeconds)} / {formatMMSS(totalBriefSeconds)}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div
                className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Synchronized Transcript Segments */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-400">
                Transcription synchronisée (cliquez sur un chapitre pour y accéder directement)
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {audioBrief.segments.map((seg, idx) => {
                  const isCurrent = idx === activeSegmentIndex;
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => handleJumpToSegment(idx)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/15 border-amber-500/60 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span
                          className={`font-semibold ${
                            isCurrent ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}. {seg.topic}
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">
                          {seg.timeRange}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{seg.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. LE MODE RATTRAPAGE SELON LE TEMPS LIBRE */}
      <section aria-labelledby="catchup-time-heading" className="space-y-5">
        <div className="rounded-2xl bg-white dark:bg-[#131722] border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="catchup-time-heading"
                className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white"
              >
                Mode Rattrapage selon votre temps libre
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Choisissez votre créneau : Radar compose une sélection multi-formats dont la durée totale correspond exactement à votre disponibilité.
              </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold tabular-nums shrink-0 self-start sm:self-center">
              Durée cumulée : {catchupSelection.totalMinutes} min / {selectedSlot} min
            </div>
          </div>

          {/* 4 Time Slot Buttons: 5 min, 15 min, 30 min, 1 heure */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            role="group"
            aria-label="Choisir son créneau de temps libre"
          >
            {TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot.minutes;
              return (
                <button
                  key={slot.minutes}
                  type="button"
                  onClick={() => setSelectedSlot(slot.minutes)}
                  aria-pressed={isSelected}
                  className={`min-h-[72px] p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-amber-500 dark:text-slate-950 dark:border-amber-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-bold font-mono tabular-nums">
                      {slot.label}
                    </span>
                    <Clock className="w-4 h-4 opacity-75" />
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      isSelected
                        ? 'text-slate-300 dark:text-slate-900'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {slot.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Generated Playlist Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Votre playlist sur mesure pour {selectedSlot === 60 ? '1 heure' : `${selectedSlot} minutes`} ({catchupSelection.playlist.length} étape{catchupSelection.playlist.length > 1 ? 's' : ''})
            </h3>
            <span className="text-xs font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
              Calibrage exact : {catchupSelection.totalMinutes} min
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catchupSelection.playlist.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                isSaved={watchlistIds.includes(item.id)}
                onToggleSave={onToggleSave}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
