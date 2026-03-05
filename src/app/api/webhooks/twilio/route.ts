import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPhone } from "@/utils/encryption";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;

    // Parse the form-encoded body
    const formData = await request.formData();
    const body: Record<string, string> = {};
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });

    // Validate Twilio signature
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const url = request.url;

    const isValid = twilio.validateRequest(authToken, signature, url, body);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Twilio signature" },
        { status: 403 }
      );
    }

    const fromPhone = body.From;
    const messageBody = body.Body;

    if (!fromPhone || !messageBody) {
      return NextResponse.json(
        { error: "Missing From or Body in request" },
        { status: 400 }
      );
    }

    // Hash the phone number to find the elder — never log the raw phone
    const phoneHash = hashPhone(fromPhone);

    const supabase = createServiceRoleClient();

    // Find the elder by phone hash
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("id, family_id, preferred_name, is_active")
      .eq("phone_hash", phoneHash)
      .eq("is_active", true)
      .single();

    if (elderError || !elder) {
      // Return TwiML with no reply for unknown numbers
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Find the active check-in session for this elder
    const { data: session, error: sessionError } = await supabase
      .from("check_in_sessions")
      .select("*")
      .eq("elder_id", elder.id)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Update session status to in_progress if scheduled
    if (session.status === "scheduled") {
      await supabase
        .from("check_in_sessions")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", session.id);
    }

    // Store the inbound message
    await supabase.from("messages").insert({
      family_id: elder.family_id,
      session_id: session.id,
      elder_id: elder.id,
      direction: "inbound",
      body: messageBody,
      twilio_sid: body.MessageSid ?? null,
    });

    // Get session context (previous messages)
    const { data: previousMessages } = await supabase
      .from("messages")
      .select("direction, body")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    const sessionContext = (previousMessages ?? []).map((msg) => ({
      role: msg.direction === "inbound" ? "elder" : "assistant",
      content: msg.body,
    }));

    // Call the AI endpoint internally
    const aiPayload = {
      message: messageBody,
      elderPreferredName: elder.preferred_name,
      sessionContext,
    };

    const aiBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const aiResponse = await fetch(`${aiBaseUrl}/api/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiPayload),
    });

    const aiResult = await aiResponse.json();

    // Update inbound message with AI classification
    if (previousMessages && previousMessages.length > 0) {
      const lastInbound = previousMessages[previousMessages.length - 1];
      if (lastInbound) {
        await supabase
          .from("messages")
          .update({
            ai_classification: aiResult.classification,
            ai_confidence: aiResult.confidence,
          })
          .eq("session_id", session.id)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(1);
      }
    }

    // If escalation detected, create escalation record and notify family
    if (aiResult.isEscalation) {
      await supabase.from("escalations").insert({
        family_id: elder.family_id,
        elder_id: elder.id,
        session_id: session.id,
        type: aiResult.escalationReason?.includes("keyword")
          ? "keyword"
          : "ai_detected",
        severity: "high",
        description: aiResult.escalationReason ?? "Escalation detected",
        status: "open",
      });

      await supabase
        .from("check_in_sessions")
        .update({
          status: "escalated",
          escalation_triggered: true,
          escalation_reason: aiResult.escalationReason,
        })
        .eq("id", session.id);

      // Send alert to family members who receive escalation alerts
      const { data: alertMembers } = await supabase
        .from("family_members")
        .select("phone, email, full_name")
        .eq("family_id", elder.family_id)
        .eq("receive_escalation_alerts", true);

      const twilioClient = twilio(twilioAccountSid, authToken);

      for (const member of alertMembers ?? []) {
        if (member.phone) {
          await twilioClient.messages.create({
            to: member.phone,
            from: twilioPhoneNumber,
            body: `CheckMate Alert: ${elder.preferred_name}'s check-in requires attention. Reason: ${aiResult.escalationReason ?? "Concerning response detected"}. Please check the app for details.`,
          });

          await supabase.from("notification_log").insert({
            family_id: elder.family_id,
            type: "sms",
            recipient: member.phone,
            subject: "Escalation Alert",
            body: `Escalation alert for ${elder.preferred_name}`,
            status: "sent",
          });
        }
      }

      // Return TwiML with no automated reply for escalations
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Send outbound SMS reply
    const replyText = aiResult.response;
    const twilioClient = twilio(twilioAccountSid, authToken);

    if (replyText) {
      const twilioMessage = await twilioClient.messages.create({
        to: fromPhone,
        from: twilioPhoneNumber,
        body: replyText,
      });

      // Store the outbound message
      await supabase.from("messages").insert({
        family_id: elder.family_id,
        session_id: session.id,
        elder_id: elder.id,
        direction: "outbound",
        body: replyText,
        twilio_sid: twilioMessage.sid,
      });

      // Update turn count
      const newTurnCount = session.turn_count + 1;
      const updateData: Record<string, unknown> = {
        turn_count: newTurnCount,
      };

      // If we've hit max turns, mark session as completed
      if (newTurnCount >= 4) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("check_in_sessions")
        .update(updateData)
        .eq("id", session.id);

      // Update elder's last check-in timestamp
      await supabase
        .from("elders")
        .update({ last_check_in_at: new Date().toISOString() })
        .eq("id", elder.id);
    }

    // Return TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" }, status: 500 }
    );
  }
}
