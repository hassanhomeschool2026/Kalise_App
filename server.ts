import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { analyzePatterns, selectRelevantPatterns } from './src/utils/patternEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

// Fallback intelligent responses if API key is temporarily unavailable or offline
function generateLocalKaliseResponse(userMessage: string, history: Array<{ role: string; content: string }>): string {
  const lower = userMessage.toLowerCase();

  // Medication missed dose inquiry guard
  if (
    (lower.includes('forgot') || lower.includes('missed')) &&
    (lower.includes('med') || lower.includes('dose') || lower.includes('pill') || lower.includes('prescription'))
  ) {
    return "I can help you keep track of what happened, but because I am an AI, I cannot advise whether you should take an extra dose or change your schedule. The safest next step is to check your medication's official instructions or contact your pharmacist or prescribing doctor. Would you like me to help you log this in your personal notes?";
  }

  if (lower.includes('racing') || lower.includes('thoughts') || lower.includes('mind') || lower.includes('sleep') || lower.includes('night')) {
    return "Racing thoughts at night can feel loud and overwhelming when everything else gets quiet. Let's trace this back. What is one specific thought or worry taking up the most space right now?";
  }
  if (lower.includes('todo') || lower.includes('manage') || lower.includes('lot to do') || lower.includes('overwhelmed') || lower.includes('busy')) {
    return "When everything piles up at once, the sheer volume makes it exhausting even to decide where to look. You don't have to sort it all out this second.";
  }
  if (lower.includes('frustrated') || lower.includes('depends') || lower.includes('responsibility') || lower.includes('alone') || lower.includes('heavy')) {
    return "That makes complete sense. When you're carrying the weight of multiple responsibilities without backup, the frustration is a natural response to an impossible load.";
  }
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('panic') || lower.includes('worry')) {
    return "Anxiety has a way of making every future scenario feel urgent right now. Let's keep it grounded in what is actually happening in front of you today.";
  }
  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('burnout') || lower.includes('drained')) {
    return "Exhaustion makes everything harder to process. When you're running on empty, even small demands feel heavy.";
  }
  if (lower.includes('work') || lower.includes('job') || lower.includes('boss') || lower.includes('career')) {
    return "Work stress can wear you down quickly, especially when expectations keep shifting.";
  }
  if (lower.includes('boundary') || lower.includes('guilt') || lower.includes('saying no')) {
    return "Setting boundaries often brings up guilt when you're used to keeping the peace and absorbing everyone else's friction.";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello. What's on your mind today?";
  }

  const fallbacks = [
    "I'm listening. What's the main thing on your mind right now?",
    "What part of this situation feels the most pressing for you right now?",
    "Let's talk about what's going on. What happened just before you started noticing this?",
    "What would be the most supportive way to approach this together right now?"
  ];
  const index = Math.abs(userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % fallbacks.length;
  return fallbacks[index];
}

// Chat API endpoint
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

    // 2. Pattern Engine & Context Selector (Deterministic, strictly private)
    const detectedPatterns = analyzePatterns(moods || []);
    const relevantPatterns = selectRelevantPatterns(detectedPatterns, userText);

    // 3. Call Google GenAI if client is configured
    if (aiClient) {
      try {
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

        let history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        for (const m of historyMessages) {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const text = m.content;
          if (!text) continue;
          if (history.length > 0 && history[history.length - 1].role === role) {
            history[history.length - 1].parts[0].text += `\n${text}`;
          } else {
            history.push({ role, parts: [{ text }] });
          }
        }
        if (history.length > 0 && history[0].role === 'model') {
          history.shift();
        }

        console.log('FINAL CONTENTS SENT TO GEMINI:', JSON.stringify({
          model: GEMINI_MODEL,
          history,
          systemInstruction,
          userText,
        }, null, 2));

        const chat = aiClient.chats.create({
          model: GEMINI_MODEL,
          history,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.9,
          },
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 30000)
        );

        const response = await Promise.race([
          chat.sendMessage({ message: userText }),
          timeoutPromise,
        ]) as any;

        const rawReply = response.text || "I'm right here with you. Let's take this one moment at a time.";
        const reply = rawReply.replace(/—/g, ' - ');
        res.json({ reply, isCrisis: false, model: GEMINI_MODEL });
        return;
      } catch (geminiError: unknown) {
        const errStr = String(geminiError);
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
          console.log('Gemini API quota reached, using local resilient companion mode.');
        } else {
          console.error('Gemini API call failed, falling back to local companion logic:', geminiError);
        }
        // Fallback to local companion
        const fallbackReply = generateLocalKaliseResponse(userText, messages);
        res.json({ reply: fallbackReply, isCrisis: false, model: GEMINI_MODEL });
        return;
      }
    }

    // 4. Fallback when API key is not configured in environment
    const fallbackReply = generateLocalKaliseResponse(userText, messages);
    res.json({ reply: fallbackReply, isCrisis: false, model: GEMINI_MODEL });
  } catch (error: unknown) {
    console.error('Error handling Kalise chat request:', error);
    res.status(500).json({
      error: 'Unable to process conversation at this time.',
      reply: "I'm having a brief connection pause, but I'm here. Take a gentle breath, and try sending your thought again.",
    });
  }
});

// Dedicated verification endpoint for testing Google Gemini connection
app.get('/api/gemini/test', async (_req: Request, res: Response) => {
  if (!aiClient) {
    res.status(200).json({
      configured: false,
      model: GEMINI_MODEL,
      message: 'GEMINI_API_KEY environment variable is not configured. Companion will run in local resilient mode until configured.',
    });
    return;
  }

  try {
    const testResponse = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: 'Respond with the single word: Connected',
    });

    res.json({
      configured: true,
      success: true,
      model: GEMINI_MODEL,
      reply: testResponse.text?.trim(),
      message: 'Google Gemini API connection verified successfully.',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      configured: true,
      success: false,
      model: GEMINI_MODEL,
      error: errorMessage,
      message: 'Google Gemini API call failed.',
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
