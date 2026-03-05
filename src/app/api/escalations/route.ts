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
    const status = searchParams.get("status");

    let query = supabase
      .from("escalations")
      .select("*, elders(preferred_name)")
      .eq("family_id", familyMember.family_id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: escalations, error: escalationsError } = await query;

    if (escalationsError) {
      return NextResponse.json(
        { error: "Failed to fetch escalations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ escalations });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { escalation_id, action, notes } = body;

    if (!escalation_id) {
      return NextResponse.json(
        { error: "escalation_id is required" },
        { status: 400 }
      );
    }

    if (!action || !["acknowledge", "resolve"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'acknowledge' or 'resolve'" },
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

    // Verify the escalation belongs to the same family
    const { data: existing, error: fetchError } = await supabase
      .from("escalations")
      .select("id, status")
      .eq("id", escalation_id)
      .eq("family_id", familyMember.family_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Escalation not found in your family" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {};

    if (action === "acknowledge") {
      if (existing.status !== "open") {
        return NextResponse.json(
          { error: "Only open escalations can be acknowledged" },
          { status: 400 }
        );
      }
      updateData.status = "acknowledged";
      updateData.acknowledged_by = user.id;
      updateData.acknowledged_at = now;
    } else if (action === "resolve") {
      if (existing.status === "resolved") {
        return NextResponse.json(
          { error: "Escalation is already resolved" },
          { status: 400 }
        );
      }
      updateData.status = "resolved";
      updateData.resolved_by = user.id;
      updateData.resolved_at = now;
    }

    if (notes) {
      updateData.notes = notes;
    }

    const { data: escalation, error: updateError } = await supabase
      .from("escalations")
      .update(updateData)
      .eq("id", escalation_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update escalation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ escalation });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
