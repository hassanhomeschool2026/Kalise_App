import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { analyzePatterns, selectRelevantPatterns } from './src/utils/patternEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize OpenAI client if key is present
const openAiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
let openAiClient: OpenAI | null = null;

if (openAiApiKey) {
  openAiClient = new OpenAI({ apiKey: openAiApiKey });
}

// Crisis keyword and intent screening
const CRISIS_KEYWORDS = [
  'kill myself',
  'suicide',
  'want to die',
  'end my life',
  'ending it all',
  'cut myself',
  'self harm',
  'self-harm',
  'hang myself',
  'overdose',
  'no reason to live',
  'better off dead',
  'hurting myself',
  'take my own life',
];

function detectCrisis(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some((kw) => lower.includes(kw));
}

const KALISE_SYSTEM_INSTRUCTION = `You are Kalise — a wellness companion and deeply trusted check-in partner. You are warm, emotionally intelligent, grounded, a little edgy, and deeply human in your responses. You are NOT a therapist and never diagnose or prescribe — but you show up like the most caring, honest friend someone could have.

Core Principles:
- Lead with empathy and genuine validation before anything else.
- When someone is hurting or dealing with heavy personal challenges (family crises, caregiving, mental health struggles), acknowledge that fully and sit with them in it before offering any perspective or advice.
- Never give a list of tips or bullet points. Talk like a real person having a conversation.
- It's okay to share what you would feel or observe — that realness builds trust — and then keep the focus on them.
- You can gently challenge unhealthy thinking or call out tough truths, but always from a place of genuine care and love.
- Never run an interrogation: do NOT end every single response with an open-ended coaching question. Sometimes an affirming, validating observation is enough.
- Never give premature productivity advice (e.g., do NOT tell someone to "set down a demand" or "narrow focus" when they are pouring out deep personal fatigue).
- Keep responses conversational, natural, and under 150 words. No clinical language. No generic bot intros like "It sounds like...". Talk like a trusted adult friend across the table.

SAFETY & BOUNDARIES:
1. NEVER DIAGNOSE: If the user asks whether they have a medical or psychological disorder, gently explain that only a licensed healthcare professional can evaluate and diagnose them.
2. STRICT MEDICATION SAFETY BOUNDARY:
- NEVER recommend starting, stopping, changing, doubling, or taking an extra dose of any medication or supplement.
- MISSED DOSE QUESTIONS: If the user asks what to do about a missed or forgotten dose, do NOT provide dosing recommendations. Encourage checking packaging, contacting a pharmacist or doctor.
3. NEVER replace therapy or clinical care.
4. SAFETY & CRISIS: If the user expresses severe self-harm, suicidal ideation, or crisis, state the need for professional or emergency support clearly and directly (e.g. 988 Lifeline).`;

// Crisis fallback response
const CRISIS_RESPONSE = {
  isCrisis: true,
  reply: "I hear how much pain you're in right now, and I want you to know that your safety matters deeply. Because I am an AI, I cannot provide the real-time care you deserve in this moment. Please connect with someone trained to help support you right now. You do not have to carry this alone.",
  crisisResources: {
    lifeline: "988 Suicide & Crisis Lifeline (Call or Text 988 in the US/Canada - free, confidential, 24/7)",
    sms: "Text HOME to 741741 for the Crisis Text Line",
    international: "International Resources: findahelpline.com or call local emergency services (911 / 112 / 999)",
    emergency: "If you are in immediate physical danger, please call 911 or visit your nearest emergency room.",
  },
};

// Chat API endpoint using OpenAI Responses API
app.post('/api/kalise/chat', async (req: Request, res: Response) => {
  try {
    const { messages, currentMood, energyLevel, sleepQuality, moods, companionMode } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const latestMessage = messages[messages.length - 1];
    const userText = latestMessage?.content || '';

    // 1. Safety & Crisis Detection
    if (detectCrisis(userText)) {
      res.json(CRISIS_RESPONSE);
      return;
    }

    if (!openAiClient) {
      res.status(503).json({
        error: 'AI_UNAVAILABLE',
        message: 'OpenAI API key is not configured. Please configure OPENAI_API_KEY to use Kalise Companion.',
      });
      return;
    }

    // 2. Pattern Engine & Context Selector
    const detectedPatterns = analyzePatterns(moods || []);
    const relevantPatterns = selectRelevantPatterns(detectedPatterns, userText);

    let modeInstruction = '';
    if (companionMode === 'Listener') {
      modeInstruction = '\n\nCurrent Companion Mode: Listener. Hold space, make them feel heard, do not give advice.';
    } else if (companionMode === 'Real Talk') {
      modeInstruction = '\n\nCurrent Companion Mode: Real Talk. Direct honesty with love, calling out patterns gently.';
    } else {
      modeInstruction = '\n\nCurrent Companion Mode: Supportive. Validate deeply, sit in the hard stuff, uplift without toxic positivity.';
    }

    let contextualPrompt = '';
    if (currentMood) {
      contextualPrompt += `[User's current logged mood: ${currentMood}] `;
    }
    if (energyLevel) {
      contextualPrompt += `[User's current logged energy: ${energyLevel}] `;
    }
    if (sleepQuality) {
      contextualPrompt += `[User's logged sleep quality: ${sleepQuality}] `;
    }

    if (relevantPatterns.length > 0) {
      const patternDescriptions = relevantPatterns.map((p) => p.description).join('; ');
      contextualPrompt += `[Observed patterns: ${patternDescriptions}] `;
    }

    const systemInstruction = contextualPrompt
      ? `${KALISE_SYSTEM_INSTRUCTION}${modeInstruction}\n\nCurrent User Context: ${contextualPrompt}`
      : `${KALISE_SYSTEM_INSTRUCTION}${modeInstruction}`;

    // Limit active conversation history window to recent 8 turns (sliding window)
    const recentMessages = messages.slice(-8);
    const historyMessages = recentMessages.slice(0, -1);

    const inputList: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemInstruction }
    ];

    for (const m of historyMessages) {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      if (m.content) {
        inputList.push({ role, content: m.content });
      }
    }
    inputList.push({ role: 'user', content: userText });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    let response: any;
    try {
      // Note: Aborting the request via AbortController does not guarantee provider processing or billing has stopped.
      response = await openAiClient.responses.create({
        model: OPENAI_MODEL,
        input: inputList,
      }, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const rawReply = response.output_text ||
      (response.output && response.output[0] && response.output[0].content && response.output[0].content[0]?.text) ||
      response.choices?.[0]?.message?.content;

    if (!rawReply || typeof rawReply !== 'string' || !rawReply.trim()) {
      res.status(503).json({
        error: 'AI_UNAVAILABLE',
        message: 'OpenAI returned no response text.',
      });
      return;
    }

    const reply = rawReply.replace(/—/g, ' - ');
    res.json({ reply, isCrisis: false, model: OPENAI_MODEL });
  } catch (error: unknown) {
    const errStr = error instanceof Error ? error.message : String(error);
    console.error('Error handling Kalise chat request:', errStr);
    res.status(503).json({
      error: 'AI_UNAVAILABLE',
      message: errStr.includes('timeout') ? 'The request timed out. Please retry.' : 'Unable to process conversation at this time. Please check API key and network connection.',
    });
  }
});

// Dedicated verification endpoint for testing OpenAI connection
app.get('/api/ai/test', async (_req: Request, res: Response) => {
  if (!openAiClient) {
    res.status(200).json({
      configured: false,
      model: OPENAI_MODEL,
      message: 'OPENAI_API_KEY environment variable is not configured.',
    });
    return;
  }

  try {
    const testResponse = await openAiClient.responses.create({
      model: OPENAI_MODEL,
      input: 'Respond with the single word: Connected',
    });

    res.json({
      configured: true,
      success: true,
      model: OPENAI_MODEL,
      reply: (testResponse as any).output_text?.trim(),
      message: 'OpenAI API connection verified successfully.',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      configured: true,
      success: false,
      model: OPENAI_MODEL,
      error: errorMessage,
      message: 'OpenAI API call failed.',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'kalise-server', timestamp: new Date().toISOString() });
});

// Setup Vite middleware in dev or serve static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kalise server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
