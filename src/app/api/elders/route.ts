import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encrypt, hashPhone } from "@/utils/encryption";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: familyMember, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !familyMember) {
      return NextResponse.json(
        { error: "Family membership not found" },
        { status: 404 }
      );
    }

    const { data: elders, error: eldersError } = await supabase
      .from("elders")
      .select("*")
      .eq("family_id", familyMember.family_id);

    if (eldersError) {
      return NextResponse.json(
        { error: "Failed to fetch elders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ elders });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferredName, fullName, phone, timezone, checkInTime, frequency } =
      body;

    if (!preferredName || typeof preferredName !== "string") {
      return NextResponse.json(
        { error: "preferredName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!fullName || typeof fullName !== "string") {
      return NextResponse.json(
        { error: "fullName is required and must be a string" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "phone is required and must be a string" },
        { status: 400 }
      );
    }

    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json(
        { error: "timezone is required and must be a string" },
        { status: 400 }
      );
    }

    if (!checkInTime || typeof checkInTime !== "string") {
      return NextResponse.json(
        { error: "checkInTime is required and must be a string" },
        { status: 400 }
      );
    }

    if (
      !frequency ||
      !["daily", "twice_daily", "weekly"].includes(frequency)
    ) {
      return NextResponse.json(
        {
          error:
            "frequency is required and must be one of: daily, twice_daily, weekly",
        },
        { status: 400 }
      );
    }

    const { data: familyMember, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !familyMember) {
      return NextResponse.json(
        { error: "Family membership not found" },
        { status: 404 }
      );
    }

    const fullNameEncrypted = encrypt(fullName);
    const phoneEncrypted = encrypt(phone);
    const phoneHash = hashPhone(phone);

    const { data: elder, error: insertError } = await supabase
      .from("elders")
      .insert({
        family_id: familyMember.family_id,
        preferred_name: preferredName,
        full_name_encrypted: fullNameEncrypted,
        phone_encrypted: phoneEncrypted,
        phone_hash: phoneHash,
        timezone,
        preferred_check_in_time: checkInTime,
        check_in_frequency: frequency,
        is_active: true,
        mood_trend: "unknown",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create elder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ elder }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
