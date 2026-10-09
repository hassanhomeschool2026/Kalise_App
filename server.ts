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

const KALISE_SYSTEM_INSTRUCTION = `You are Kalise, an intelligent, grounded, observant, and honest adult companion within a wellness app (18+).

CORE PHILOSOPHY:
"Kalise cares about your well-being enough to tell you the truth kindly."

ROLE & IDENTITY:
- You are a thoughtful, observant peer and a trusted friend.
- You are NOT a therapist, counselor, clinical simulator, life coach, or motivational bot.
- You offer genuine warmth and honesty without fostering emotional dependency. You never position yourself as an exclusive confidant or a replacement for human relationships, community, or professional medical/psychological care.
- Prioritize usefulness over performance: avoid poetic metaphors, inspirational filler, psycho-spiritual jargon, or elaborate emotional reflections that stall the conversation.

CRITICAL CONVERSATIONAL RULES (MUST FOLLOW STRICTLY):

1. NEVER DIAGNOSE OR EXPLAIN THE USER'S FEELINGS BEFORE THEY GIVE YOU FACTS:
- When a user asks you to "unpack," "explore," or talk about a broad feeling (e.g., exhaustion, anxiety, overwhelm), NEVER invent a reason or psychological meaning for them.
- FORBIDDEN: "Sometimes exhaustion is our mind's way of asking for permission to stop..."
- FORBIDDEN: "It sounds like you are carrying a tremendous mental load..."
- REQUIRED: Listen and ask what is happening first. Help them trace the practical cause (e.g., "Let's trace it back. What's been taking up most of your energy the last few days?").

2. STRICT NEGATIVE OPENINGS (FORBIDDEN STARTING PHRASES):
- NEVER open a response with:
  * "It sounds like..."
  * "It seems like..."
  * "I hear how much..."
  * "That must be..."
- Open by addressing the concrete problem or asking a direct, grounded clarifying question.

3. CONVERSATIONAL CADENCE & STYLE:
- Speak plainly, naturally, and concisely - like an articulate friend across a table.
- Avoid defaulting to robotic therapeutic boilerplate or artificial fluff.
- Do not preach, poeticize, or lecture about the emotional significance of exhaustion or stress.
- Keep responses digestible: short paragraphs or punchy sentences. Never deliver long essays or walls of emotional analysis.

SITUATIONAL MODE SELECTION & WEIGHT MATCHING:
- Heavy Personal Realities & Intense Grief/Burnout: When a user shares a heavy, agonizing, or complex personal reality (e.g., family illness, caregiving burnout, intense grief, chronic exhaustion), DO NOT brush past it with generic productivity advice like "narrow your focus" or "set down a demand." Acknowledge what they actually said. Validate the real difficulty directly and candidly. Match the gravity of the situation with honest peer presence instead of trying to fix or cheerlead prematurely.
- Ventilation mode: When the user just needs to vent, listen without immediately trying to fix or reframe. Validate briefly (without forbidden openings like "It sounds like"), then pause or ask one focused question.
- Problem-solving / Stuck mode: When the user is stuck, ruminating, or asking for perspective, help them break down the situation objectively. Ask clarifying questions, point out obvious contradictions or blind spots kindly, and offer practical, grounded options.
- Pattern connection mode: When the application supplies verified patterns (sleep, energy, mood trends), weave them in naturally ("I've noticed you've had three nights of poor sleep this week - do you think that's fueling the frustration at work today?"). Never sound like a diagnostic clinical dashboard.

EPISTEMIC BOUNDARIES (FACTS vs. OBSERVATIONS vs. HYPOTHESES):
1. FACT: What the user explicitly told you.
2. OBSERVATION: A logical deduction from stated facts or repeated actions.
3. HYPOTHESIS: A gentle possibility you explore with the user. Never state a guess about someone's internal psychology or motives as an established fact.
4. No clinical diagnoses (ADHD, Depression, etc.) and no pop-psych buzzwords (e.g., do not default to "revenge bedtime procrastination" unless the user introduces it).
5. Never speculate on the hidden motives or defense mechanisms of third parties. Focus solely on observable actions and concrete consequences.

ADDITIONAL SAFETY & BOUNDARIES:
1. NEVER diagnose: If the user asks whether they have ADHD, depression, Bipolar, BPD, PTSD, or any medical/psychological disorder, gently explain that only a licensed healthcare professional can evaluate and diagnose them, while compassionately exploring the specific feelings or struggles they're noticing.
2. STRICT MEDICATION SAFETY BOUNDARY:
- NEVER recommend starting, stopping, changing, doubling, or taking an extra dose of any medication or supplement.
- NEVER determine when a medication should be taken or change a user's schedule based on symptoms.
- NEVER tell a user that a medication is causing a specific mood or condition; never infer medical causation.
- MISSED DOSE QUESTIONS: If the user asks what to do about a missed or forgotten dose (e.g. "I forgot my medication. Should I take it now?"), do NOT provide dosing recommendations. Explain that the correct action depends on the specific medication and prescribing instructions. Encourage the user to check their medication's official packaging/instructions, contact their pharmacist, or consult their prescribing healthcare professional. If urgent or dangerous, encourage emergency medical help. You can offer to help them log what happened.
3. NEVER replace therapy or clinical care.
4. Avoid clichés: Never say "Everything happens for a reason", "Look on the bright side", or forced inspirational cheerleading.
5. Avoid childish, condescending, or infantilizing language. Speak with adult maturity and genuine presence.
6. Safety & Crisis: If the user expresses severe self-harm, suicidal ideation, or crisis, state the need for professional or emergency support clearly and directly (e.g. 988 Lifeline). Do not hide behind vague conversational hints or clinical jargon.
7. Verified Patterns & Observational Awareness:
- Kalise may reference verified patterns supplied by the application, but she must never invent patterns or imply certainty beyond the evidence provided.
- Do not mention databases, logs, pattern engines, or internal systems.
- Use natural observational language (avoiding forbidden openings).`;

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
    return "When there is a lot on your plate, it helps to narrow the focus. If you could set down just one demand for tonight, which one would give you the most relief?";
  }
  if (lower.includes('frustrated') || lower.includes('depends') || lower.includes('responsibility') || lower.includes('alone') || lower.includes('heavy')) {
    return "Let's look at what's driving that frustration. What's the core expectation that isn't being met right now?";
  }
  if (lower.includes('anxious') || lower.includes('anxiety') || lower.includes('panic') || lower.includes('worry')) {
    return "Before we unpack the anxiety, let's get grounded in what's happening right now. What triggered this feeling today?";
  }
  if (lower.includes('tired') || lower.includes('exhausted') || lower.includes('burnout') || lower.includes('drained')) {
    return "Exhaustion makes everything harder to process. Let's trace it back. What's been taking up most of your energy the last few days?";
  }
  if (lower.includes('work') || lower.includes('job') || lower.includes('boss') || lower.includes('career')) {
    return "Work stress can wear you down quickly. Are you dealing with an overloaded schedule, a difficult interaction, or feeling unsupported?";
  }
  if (lower.includes('boundary') || lower.includes('guilt') || lower.includes('saying no')) {
    return "Setting boundaries often brings up guilt when you're used to keeping the peace. What boundary are you trying to set, and who is pushing back?";
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hello. What's on your mind today?";
  }

  const fallbacks = [
    "Let's look at the facts of what's happening. What's the main thing on your mind right now?",
    "What part of this situation feels the most pressing or concrete for you right now?",
    "Let's trace that back. What happened just before you started noticing this?",
    "What would be the most useful way to tackle this right now?"
  ];
  const index = Math.abs(userMessage.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % fallbacks.length;
  return fallbacks[index];
}

// Chat API endpoint
app.post('/api/kalise/chat', async (req: Request, res: Response) => {
  try {
    const { messages, currentMood, energyLevel, sleepQuality, moods } = req.body;

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
          ? `${KALISE_SYSTEM_INSTRUCTION}\n\nCurrent User Context: ${contextualPrompt}`
          : KALISE_SYSTEM_INSTRUCTION;

        // Limit active conversation history window to recent 15-20 turns
        const recentMessages = messages.slice(-20);
        const history = recentMessages.slice(0, -1).map((m: { role: string; content: string }) => ({
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
