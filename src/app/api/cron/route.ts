import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { decrypt } from "@/utils/encryption";
import twilio from "twilio";

export async function GET(request: NextRequest) {
  try {
    // Validate CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get current UTC time
    const now = new Date();
    const currentUtcHour = now.getUTCHours();
    const currentUtcMinutes = now.getUTCMinutes();

    // Fetch all active elders with their timezone and check-in time
    const { data: elders, error: eldersError } = await supabase
      .from("elders")
      .select(
        "id, family_id, preferred_name, phone_encrypted, timezone, preferred_check_in_time, check_in_frequency"
      )
      .eq("is_active", true);

    if (eldersError) {
      return NextResponse.json(
        { error: "Failed to fetch elders" },
        { status: 500 }
      );
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID!;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN!;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER!;
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    let sessionsCreated = 0;

    for (const elder of elders ?? []) {
      // Parse the elder's preferred check-in time (e.g., "09:00")
      const [preferredHour, preferredMinute] = elder.preferred_check_in_time
        .split(":")
        .map(Number);

      // Calculate the UTC equivalent of the elder's preferred time in their timezone
      const elderLocalNow = new Date(
        now.toLocaleString("en-US", { timeZone: elder.timezone })
      );
      const elderLocalHour = elderLocalNow.getHours();
      const elderLocalMinutes = elderLocalNow.getMinutes();

      // Check if the current time in the elder's timezone matches their preferred check-in time
      // Allow a 30-minute window for cron timing flexibility
      const hourMatches = elderLocalHour === preferredHour;
      const minuteWindow =
        Math.abs(elderLocalMinutes - (preferredMinute ?? 0)) < 30;

      if (!hourMatches || !minuteWindow) {
        continue;
      }

      // Check for frequency — skip if not the right day
      if (elder.check_in_frequency === "weekly") {
        // Only check in on Mondays (in the elder's timezone)
        if (elderLocalNow.getDay() !== 1) continue;
      }

      // Check there's no existing active session for today
      const todayStart = new Date(elderLocalNow);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(elderLocalNow);
      todayEnd.setHours(23, 59, 59, 999);

      const { data: existingSessions } = await supabase
        .from("check_in_sessions")
        .select("id")
        .eq("elder_id", elder.id)
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString())
        .limit(1);

      if (existingSessions && existingSessions.length > 0) {
        continue;
      }

      // Create check-in session
      const scheduledAt = new Date();
      const { data: session, error: sessionError } = await supabase
        .from("check_in_sessions")
        .insert({
          family_id: elder.family_id,
          elder_id: elder.id,
          status: "scheduled",
          scheduled_at: scheduledAt.toISOString(),
          turn_count: 0,
          escalation_triggered: false,
        })
        .select()
        .single();

      if (sessionError || !session) {
        continue;
      }

      // Decrypt the elder's phone number for sending SMS
      const elderPhone = decrypt(elder.phone_encrypted);

      // Send initial greeting SMS
      const greetingMessage = `Hi ${elder.preferred_name}! It's time for your check-in. How are you feeling today?`;

      try {
        const twilioMessage = await twilioClient.messages.create({
          to: elderPhone,
          from: twilioPhoneNumber,
          body: greetingMessage,
        });

        // Store the outbound message
        await supabase.from("messages").insert({
          family_id: elder.family_id,
          session_id: session.id,
          elder_id: elder.id,
          direction: "outbound",
          body: greetingMessage,
          twilio_sid: twilioMessage.sid,
        });

        sessionsCreated++;
      } catch {
        // If SMS fails, still keep the session but log the failure
        await supabase.from("notification_log").insert({
          family_id: elder.family_id,
          type: "sms",
          recipient: "elder",
          subject: "Check-in SMS Failed",
          body: `Failed to send initial check-in SMS to ${elder.preferred_name}`,
          status: "failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionsCreated,
      timestamp: now.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
