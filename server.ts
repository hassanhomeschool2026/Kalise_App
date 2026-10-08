import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
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

const KALISE_SYSTEM_INSTRUCTION = `You are Kalise, an adult emotional-wellness AI companion (18+).

Your purpose:
- Help users feel heard, explore their emotions, organize their thoughts, reflect on difficult situations, and practice healthy emotional resilience.
- Provide a safe, calm, grounded space to breathe and decompress.

Your personality:
- Warm, empathetic, calm, nonjudgmental, intelligent, respectful, conversational, and emotionally aware.
- Listen first before jumping into solutions.
- Validate the feeling underneath the situation rather than dismissing it.
- Ask thoughtful, open follow-up questions when appropriate (e.g. "It sounds like what hurt most wasn't just the change itself, but feeling blindsided by it. Does that resonate with how you're experiencing it?").
- Honest about your nature: you are an AI companion, not a human, and not a licensed mental-health professional or medical practitioner.

Strict boundaries:
1. NEVER diagnose: If the user asks whether they have ADHD, depression, Bipolar, BPD, PTSD, or any medical/psychological disorder, gently explain that only a licensed healthcare professional can evaluate and diagnose them, while compassionately exploring the specific feelings or struggles they're noticing.
2. STRICT MEDICATION SAFETY BOUNDARY:
- NEVER recommend starting, stopping, changing, doubling, or taking an extra dose of any medication or supplement.
- NEVER determine when a medication should be taken or change a user's schedule based on symptoms.
- NEVER tell a user that a medication is causing a specific mood or condition; never infer medical causation.
- MISSED DOSE QUESTIONS: If the user asks what to do about a missed or forgotten dose (e.g. "I forgot my medication. Should I take it now?"), do NOT provide dosing recommendations. Explain that the correct action depends on the specific medication and prescribing instructions. Encourage the user to check their medication's official packaging/instructions, contact their pharmacist, or consult their prescribing healthcare professional. If urgent or dangerous, encourage emergency medical help. You can offer to help them log what happened.
3. NEVER replace therapy or clinical care.
4. Avoid clichés: Never say "Everything happens for a reason", "Look on the bright side", or forced inspirational cheerleading.
5. Avoid childish, condescending, or infantilizing language. Speak with adult maturity and genuine presence.
6. Safety & Crisis: If the user expresses suicidal thoughts, severe self-harm, or immediate danger, your absolute top priority is direct, calm, supportive safety. Acknowledge their immense pain without judgment, and encourage them to connect with immediate crisis professionals right now (988 Lifeline).

Keep responses digestible and conversational: avoid overwhelming an already exhausted user with large walls of text.`;

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
    return "Racing thoughts at night can feel so loud and overwhelming when everything else gets quiet. Let's try to gently anchor ourselves right here. What is one thought or worry taking up the most space in your mind right now?";
  }
  if (lower.includes('todo') || lower.includes('manage') || lower.includes('lot to do') || lower.includes('overwhelmed') || lower.includes('busy')) {
    return "When there is so much to manage, it's completely natural to feel a heavy sense of paralysis. You don't have to figure out or solve everything today. If you could set down just one of those demands for tonight, which one would feel like the biggest relief?";
  }
  if (lower.includes('frustrated') || lower.includes('depends') || lower.includes('responsibility') || lower.includes('alone') || lower.includes('heavy')) {
    return "Carrying the weight of feeling like everything depends on you is exhausting. It is completely valid to feel frustrated when support feels out of reach. What would it look like to give yourself permission to drop the heavy mantle of responsibility, even just for the next hour?";
  }
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('panic') || lower.includes('worry')) {
    return "Anxiety can feel so physically heavy in the chest and shoulders. Before we try to untangle the thoughts, take a slow breath with me. What is the loudest thing your mind is trying to convince you of right now?";
  }
  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('burnout') || lower.includes('drained')) {
    return "It sounds like you've been carrying a tremendous mental load for a while. Sometimes exhaustion is our mind's way of asking for permission to just stop trying to fix everything today. What would feeling truly rested look like for you tonight?";
  }
  if (lower.includes('work') || lower.includes('job') || lower.includes('boss') || lower.includes('career')) {
    return "Work stress has a way of invading every corner of our personal peace. Are you feeling frustrated with an interaction, overloaded with demands, or feeling like your effort isn't recognized?";
  }
  if (lower.includes('boundary') || lower.includes('guilt') || lower.includes('saying no')) {
    return "Setting boundaries often feels like guilt at first, especially if you're used to keeping the peace. But a boundary isn't a weapon; it's simply defining where your energy ends and someone else's begins. What boundary are you considering?";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello. I'm glad you took a moment for yourself today. How is your mind and body feeling right now?";
  }

  const fallbacks = [
    "Thank you for sharing that with me. It takes real courage to put words to what you're experiencing. How is sitting with that feeling right now?",
    "I hear how much weight you're carrying in this moment. What feels like the tenderest part of this situation for you?",
    "That sounds genuinely challenging to navigate. When you notice this coming up, where do you feel it most in your body?",
    "I'm right here listening. If you could wave a magic wand and change one aspect of how today went, what would it be?"
  ];
  const index = Math.abs(userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % fallbacks.length;
  return fallbacks[index];
}

// Chat API endpoint
app.post('/api/kalise/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userNote, currentMood, energyLevel, sleepQuality } = req.body;

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

    // 2. Call Google GenAI if client is configured
    if (aiClient) {
      try {
        // Build conversational context
        const formattedContents = messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

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
        if (userNote) {
          contextualPrompt += `[User's recent reflection note: "${userNote}"] `;
        }

        const systemInstruction = contextualPrompt
          ? `${KALISE_SYSTEM_INSTRUCTION}\n\nCurrent User Context: ${contextualPrompt}`
          : KALISE_SYSTEM_INSTRUCTION;

        const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

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
          setTimeout(() => reject(new Error('Gemini API timeout')), 10000)
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
        console.error('Gemini API call failed, falling back to local companion logic:', geminiError);
        // Fallback to local companion
        const fallbackReply = generateLocalKaliseResponse(userText, messages);
        res.json({ reply: fallbackReply, isCrisis: false, model: GEMINI_MODEL });
        return;
      }
    }

    // 3. Fallback when API key is not configured in environment
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
