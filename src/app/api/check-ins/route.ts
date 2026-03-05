import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const elderId = searchParams.get("elder_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("check_in_sessions")
      .select("*, elders(preferred_name)")
      .eq("family_id", familyMember.family_id)
      .order("scheduled_at", { ascending: false });

    if (elderId) {
      query = query.eq("elder_id", elderId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      return NextResponse.json(
        { error: "Failed to fetch check-in sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
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
    const { elder_id, scheduled_at } = body;

    if (!elder_id) {
      return NextResponse.json(
        { error: "elder_id is required" },
        { status: 400 }
      );
    }

    if (!scheduled_at) {
      return NextResponse.json(
        { error: "scheduled_at is required" },
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

    // Verify the elder belongs to the same family
    const { data: elder, error: elderError } = await supabase
      .from("elders")
      .select("id")
      .eq("id", elder_id)
      .eq("family_id", familyMember.family_id)
      .single();

    if (elderError || !elder) {
      return NextResponse.json(
        { error: "Elder not found in your family" },
        { status: 404 }
      );
    }

    const { data: session, error: insertError } = await supabase
      .from("check_in_sessions")
      .insert({
        family_id: familyMember.family_id,
        elder_id,
        status: "scheduled",
        scheduled_at,
        turn_count: 0,
        escalation_triggered: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create check-in session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
