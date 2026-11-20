import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface BriefSegment {
  id: string;
  timeRange: string;
  topic: string;
  text: string;
  sourceTitle: string;
}

function buildDynamicBriefFallback(
  interests: string[],
  platforms: string[],
  unseenItems: Array<{ title: string; source: string; category: string; summary: string; urgency: string }>
): { title: string; estimatedSeconds: number; segments: BriefSegment[]; generatedBy: string } {
  const topInterests = interests.length > 0 ? interests.slice(0, 3).join(', ') : 'Tech/IA, Cinéma, Actualités';
  const topItems = unseenItems.slice(0, 4);

  const segments: BriefSegment[] = [
    {
      id: 'seg-intro',
      timeRange: '0:00 - 0:25',
      topic: 'Introduction & Météo du Radar',
      text: `Bonjour et bienvenue dans votre Brief Audio Radar du jour. Aujourd'hui, nous avons filtré le bruit médiatique autour de vos passions — notamment ${topInterests} — pour ne retenir que l'essentiel à ne pas manquer en trois minutes chrono.`,
      sourceTitle: 'Synthèse Radar Quotidienne',
    },
  ];

  topItems.forEach((item, idx) => {
    const startSec = 25 + idx * 35;
    const endSec = startSec + 35;
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const urgencyIntro =
      item.urgency === 'live'
        ? 'À suivre en direct en ce moment même :'
        : item.urgency === 'expiring'
        ? 'Attention, dernière chance avant disparition du replay :'
        : 'À savourer dès que vous avez un moment :';

    segments.push({
      id: `seg-${idx + 1}`,
      timeRange: `${formatTime(startSec)} - ${formatTime(endSec)}`,
      topic: `${item.category} · ${item.source}`,
      text: `${urgencyIntro} "${item.title}" sur ${item.source}. ${item.summary} Nos Jumeaux de goûts l'ont classé parmi les pépites les plus marquantes de ces dernières vingt-quatre heures.`,
      sourceTitle: item.title,
    });
  });

  segments.push({
    id: 'seg-outro',
    timeRange: '2:45 - 3:00',
    topic: 'Conclusion & Agenda',
    text: `C'est tout pour votre tour d'horizon sur ${platforms.slice(0, 3).join(', ') || 'vos plateformes favorites'}. Retrouvez ces contenus dans votre liste Rattrapage ou activez un rappel quinze minutes avant les directs de ce soir dans l'onglet Agenda. Bonne journée !`,
    sourceTitle: 'Radar Anti-FOMO',
  });

  return {
    title: `Votre Brief Radar personnalisé (${topInterests})`,
    estimatedSeconds: 180,
    segments,
    generatedBy: 'script-dynamique',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // 1. Endpoint: Generate personalized 3-min Audio Brief script
  app.post('/api/gemini/audio-brief', async (req, res) => {
    const { interests = [], platforms = [], unseenItems = [] } = req.body || {};
    const ai = getGenAIClient();

    if (!ai) {
      return res.json(buildDynamicBriefFallback(interests, platforms, unseenItems));
    }

    try {
      const itemsPrompt = unseenItems
        .slice(0, 5)
        .map(
          (it: { title: string; source: string; category: string; summary: string; urgency: string }, i: number) =>
            `${i + 1}. [${it.category} / ${it.source} / Urgence: ${it.urgency}] "${it.title}" — ${it.summary}`
        )
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Rédige un script de "Brief Audio du jour" d'environ 3 minutes (en français, ton radio culturel vif, chaleureux, fluide et naturel à l'oral) pour un utilisateur dont les centres d'intérêt sont : ${interests.join(', ')} et les plateformes : ${platforms.join(', ')}.
Voici les contenus manqués ou urgents à synthétiser aujourd'hui :
${itemsPrompt}

Structure la réponse en 5 à 6 segments chronométrés (Introduction, 3 ou 4 sujets clés, Conclusion) prêts à être lus par synthèse vocale.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Tu es la voix éditoriale de Radar, un présentateur radio français passionné, concis et anti-FOMO. Écris des phrases fluides pour la synthèse vocale sans balises markdown.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Titre accrocheur du brief audio du jour',
              },
              estimatedSeconds: {
                type: Type.INTEGER,
                description: 'Durée estimée en secondes (environ 180)',
              },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timeRange: { type: Type.STRING, description: 'Ex: 0:00 - 0:30' },
                    topic: { type: Type.STRING, description: 'Thème et source du segment' },
                    text: { type: Type.STRING, description: 'Texte oral naturel à lire à voix haute' },
                    sourceTitle: { type: Type.STRING, description: 'Titre du contenu cité' },
                  },
                  required: ['id', 'timeRange', 'topic', 'text', 'sourceTitle'],
                },
              },
            },
            required: ['title', 'estimatedSeconds', 'segments'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (!parsed.segments || !Array.isArray(parsed.segments) || parsed.segments.length === 0) {
        return res.json(buildDynamicBriefFallback(interests, platforms, unseenItems));
      }

      return res.json({
        ...parsed,
        generatedBy: 'gemini-4-hydrogen',
      });
    } catch (error) {
      console.warn('Fallback to dynamic script generator for audio brief:', error);
      return res.json(buildDynamicBriefFallback(interests, platforms, unseenItems));
    }
  });

  // 2. Endpoint: Suggest new personalized gems via Gemini AI
  app.post('/api/gemini/suggest-gems', async (req, res) => {
    const { interests = [], platforms = [], mood = 'all', existingTitles = [] } = req.body || {};
    const ai = getGenAIClient();

    const fallbackGems = [
      {
        title: "Enquête : Les coulisses secrètes des câbles sous-marins de l'Atlantique",
        source: 'Arte.tv',
        creator: 'Arte Découverte',
        format: 'TV/Replay',
        category: interests[0] || 'Sciences',
        durationMinutes: 26,
        urgency: 'expiring',
        expiresInHours: 14,
        mood: 'learn',
        twinMatchPercent: 96,
        twinCount: 5,
        summary:
          "Une plongée fascinante à bord des navires câbliers qui maintiennent 99 % du trafic internet mondial face aux tempêtes et aux tensions géopolitiques.",
        actionUrl: 'https://www.arte.tv/fr/',
      },
      {
        title: 'Live Décryptage : Le futur du cinéma d’animation européen indépendant',
        source: 'YouTube Live',
        creator: 'Cinéma & Pixels',
        format: 'YouTube',
        category: interests[1] || 'Cinéma',
        durationMinutes: 18,
        urgency: 'live',
        mood: 'learn',
        twinMatchPercent: 93,
        twinCount: 4,
        summary:
          'Les réalisateurs de "Flow" et "Mars Express" répondent en direct aux questions des spectateurs sur leurs techniques de rendu hybride.',
        actionUrl: 'https://www.youtube.com/',
      },
      {
        title: 'Chronique stand-up : Quand les algorithmes décident de notre soirée du vendredi',
        source: 'France Inter · Podcast',
        creator: 'L’Humour du Soir',
        format: 'Podcasts',
        category: 'Humour',
        durationMinutes: 7,
        urgency: 'anytime',
        mood: 'laugh',
        twinMatchPercent: 91,
        twinCount: 6,
        summary:
          "Sept minutes d'autodérision mordante sur nos quarante-cinq minutes passées à faire défiler les catalogues de streaming avant de s'endormir.",
        actionUrl: 'https://www.radiofrance.fr/franceinter',
      },
    ];

    if (!ai) {
      return res.json({ gems: fallbackGems, generatedBy: 'curation-dynamique' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Suggère 3 nouvelles pépites culturelles ou médiatiques réalistes en français (articles, replays TV, vidéos YouTube, podcasts, lives) correspondant aux goûts : ${interests.join(', ')} sur les plateformes : ${platforms.join(', ')} (Humeur souhaitée : ${mood}).
Évite ces titres déjà présents : ${existingTitles.slice(0, 15).join(' | ')}.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'Tu es un curateur culturel français expert pour l’application anti-FOMO Radar. Propose des contenus réalistes, précis, variés et captivants.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    source: { type: Type.STRING, description: 'Ex: Arte.tv, France Inter, YouTube, MUBI, Le Monde' },
                    creator: { type: Type.STRING },
                    format: {
                      type: Type.STRING,
                      description: 'Un parmi: TV/Replay, YouTube, Podcasts, Réseaux sociaux, Streaming, Presse',
                    },
                    category: {
                      type: Type.STRING,
                      description: 'Un parmi: Tech/IA, Cinéma, Sport, Musique, Humour, Actualités, Sciences, Gaming, Culture',
                    },
                    durationMinutes: { type: Type.INTEGER },
                    urgency: {
                      type: Type.STRING,
                      description: 'Un parmi: live, expiring, anytime',
                    },
                    expiresInHours: { type: Type.INTEGER },
                    mood: {
                      type: Type.STRING,
                      description: 'Un parmi: laugh, learn, background, serious',
                    },
                    twinMatchPercent: { type: Type.INTEGER },
                    twinCount: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                    actionUrl: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'source',
                    'creator',
                    'format',
                    'category',
                    'durationMinutes',
                    'urgency',
                    'mood',
                    'twinMatchPercent',
                    'twinCount',
                    'summary',
                  ],
                },
              },
            },
            required: ['gems'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (!parsed.gems || !Array.isArray(parsed.gems) || parsed.gems.length === 0) {
        return res.json({ gems: fallbackGems, generatedBy: 'curation-dynamique' });
      }
      return res.json({ gems: parsed.gems, generatedBy: 'gemini-4-hydrogen' });
    } catch (error) {
      console.warn('Fallback to dynamic gems suggestion:', error);
      return res.json({ gems: fallbackGems, generatedBy: 'curation-dynamique' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radar server listening on http://localhost:${PORT}`);
  });
}

startServer();
