import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClassificationResult {
  classification: "positive" | "neutral" | "concerning" | "escalation";
  confidence: number;
  response: string | null;
  isEscalation: boolean;
  escalationReason: string | null;
}

export async function classifyAndRespond(
  message: string,
  elderPreferredName: string,
  sessionContext: Array<{ direction: string; body: string }>,
  turnCount: number
): Promise<ClassificationResult> {
  // Check for escalation keywords first
  const keywords = (process.env.ESCALATION_KEYWORDS || "").split(",").map((k) => k.trim().toLowerCase());
  const lowerMessage = message.toLowerCase();
  const matchedKeyword = keywords.find((kw) => kw && lowerMessage.includes(kw));

  if (matchedKeyword) {
    return {
      classification: "escalation",
      confidence: 1.0,
      response: `${elderPreferredName}, I hear you and I want to make sure you're okay. I'm letting your family know right away so someone can check in on you. You're not alone.`,
      isEscalation: true,
      escalationReason: `Escalation keyword detected: "${matchedKeyword}"`,
    };
  }

  // Build context for AI — use only preferred name, never full name or medication details
  const conversationHistory = sessionContext
    .map((m) => `${m.direction === "inbound" ? elderPreferredName : "CheckMate"}: ${m.body}`)
    .join("\n");

  // Step 1: Classify the message
  const classifyResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 200,
    system: `You are analyzing a text message from an elderly person named ${elderPreferredName} during a wellness check-in. Classify their message into one of these categories:
- positive: They seem happy, healthy, and in good spirits
- neutral: Normal response, nothing concerning
- concerning: Something seems off — mentions of not feeling well, loneliness, confusion, but not an emergency
- escalation: Potential emergency — mentions of falls, severe pain, breathing issues, feeling very scared or confused

Respond with ONLY a JSON object: {"classification": "...", "confidence": 0.0-1.0}`,
    messages: [
      {
        role: "user",
        content: `Previous conversation:\n${conversationHistory}\n\nLatest message from ${elderPreferredName}: "${message}"`,
      },
    ],
  });

  let classification: ClassificationResult["classification"] = "neutral";
  let confidence = 0.5;

  try {
    const text = classifyResponse.content[0].type === "text" ? classifyResponse.content[0].text : "";
    const parsed = JSON.parse(text);
    classification = parsed.classification;
    confidence = parsed.confidence;
  } catch {
    // Default to neutral if parsing fails
  }

  // Step 2: Check if this is an escalation
  if (classification === "escalation") {
    return {
      classification,
      confidence,
      response: `${elderPreferredName}, I want you to know I'm here for you. I'm reaching out to your family right now to make sure you get the help you need. Please stay where you are if you can.`,
      isEscalation: true,
      escalationReason: `AI detected escalation-level concern with ${confidence} confidence`,
    };
  }

  // Step 3: Generate response (if under turn limit)
  if (turnCount >= 4) {
    return {
      classification,
      confidence,
      response: `It was really lovely chatting with you today, ${elderPreferredName}. I hope you have a wonderful rest of your day! We'll talk again soon.`,
      isEscalation: false,
      escalationReason: null,
    };
  }

  const responseMsg = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 300,
    system: `You are a warm, friendly companion checking in on ${elderPreferredName}, an elderly person. Your tone should be:
- Warm and conversational, like a caring grandchild
- Never clinical or medical-sounding
- If they mention any health concerns, say something like "That sounds like something worth mentioning to your doctor next time you see them"
- Never give medical advice
- Ask a natural follow-up question about their day, activities, or how they're feeling
- Keep responses short (1-2 sentences + a question)
- Use their name naturally`,
    messages: [
      {
        role: "user",
        content: `Conversation so far:\n${conversationHistory}\n\nLatest message from ${elderPreferredName}: "${message}"\n\nGenerate a warm, brief response.`,
      },
    ],
  });

  const responseText =
    responseMsg.content[0].type === "text" ? responseMsg.content[0].text : "";

  return {
    classification,
    confidence,
    response: responseText,
    isEscalation: false,
    escalationReason: null,
  };
}
