import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MAX_TURNS = 4;

interface SessionMessage {
  role: "elder" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, elderPreferredName, sessionContext } = body as {
      message: string;
      elderPreferredName: string;
      sessionContext: SessionMessage[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required and must be a string" },
        { status: 400 }
      );
    }

    if (!elderPreferredName || typeof elderPreferredName !== "string") {
      return NextResponse.json(
        { error: "elderPreferredName is required and must be a string" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic();
    const turnCount = sessionContext?.length ?? 0;

    // Step 1: Classify the message
    const classificationResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      system:
        "You are a message classifier for an elder care check-in system. " +
        "Classify the elder's message into exactly one category: positive, neutral, concerning, or escalation. " +
        "Also provide a confidence score between 0 and 1. " +
        "Respond ONLY with valid JSON: {\"classification\": \"...\", \"confidence\": 0.0}",
      messages: [
        {
          role: "user",
          content: `Classify this message from an elder named ${elderPreferredName}:\n\n"${message}"`,
        },
      ],
    });

    const classificationText =
      classificationResponse.content[0].type === "text"
        ? classificationResponse.content[0].text
        : "";

    let classification: "positive" | "neutral" | "concerning" | "escalation" =
      "neutral";
    let confidence = 0.5;

    try {
      const parsed = JSON.parse(classificationText);
      classification = parsed.classification;
      confidence = parsed.confidence;
    } catch {
      // Fall back to neutral if parsing fails
    }

    // Step 2: Check for escalation keywords
    const escalationKeywords = (process.env.ESCALATION_KEYWORDS ?? "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const messageLower = message.toLowerCase();
    const matchedKeyword = escalationKeywords.find((keyword) =>
      messageLower.includes(keyword)
    );

    let isEscalation = classification === "escalation" || !!matchedKeyword;
    let escalationReason: string | undefined;

    if (matchedKeyword) {
      isEscalation = true;
      escalationReason = `Matched escalation keyword: "${matchedKeyword}"`;
      classification = "escalation";
      confidence = 1.0;
    } else if (classification === "escalation") {
      escalationReason = "AI classified message as requiring escalation";
    }

    // If escalation, return immediately without generating a follow-up
    if (isEscalation) {
      return NextResponse.json({
        classification,
        confidence,
        response: undefined,
        isEscalation: true,
        escalationReason,
      });
    }

    // Step 3: Generate follow-up or closing message
    const conversationHistory = (sessionContext ?? []).map(
      (msg: SessionMessage) => ({
        role: (msg.role === "elder" ? "user" : "assistant") as
          | "user"
          | "assistant",
        content: msg.content,
      })
    );

    conversationHistory.push({ role: "user" as const, content: message });

    let responseText: string;

    if (turnCount >= MAX_TURNS - 1) {
      // Step 4: Generate a warm closing message
      const closingResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system:
          `You are a warm, caring companion checking in on ${elderPreferredName}. ` +
          "This is the final message of this check-in session. " +
          "Generate a brief, warm closing message. Thank them for chatting and wish them well. " +
          "Never be clinical. If they mentioned any medical concerns, gently suggest they mention it to their doctor. " +
          "Use their preferred name naturally. Do NOT include any full names or medication lists. " +
          "Keep it to 1-2 short sentences.",
        messages: conversationHistory,
      });

      responseText =
        closingResponse.content[0].type === "text"
          ? closingResponse.content[0].text
          : "";
    } else {
      // Step 3: Generate a warm follow-up
      const followUpResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system:
          `You are a warm, caring companion checking in on ${elderPreferredName}. ` +
          "Generate a brief, warm follow-up question or response to continue the conversation. " +
          "Be conversational and friendly, never clinical or robotic. " +
          "If they mention medical concerns, gently suggest they mention it to their doctor rather than offering advice. " +
          "Use their preferred name naturally but sparingly. " +
          "Do NOT include any full names or medication lists in your response. " +
          "Keep it to 1-2 short sentences.",
        messages: conversationHistory,
      });

      responseText =
        followUpResponse.content[0].type === "text"
          ? followUpResponse.content[0].text
          : "";
    }

    return NextResponse.json({
      classification,
      confidence,
      response: responseText,
      isEscalation: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
