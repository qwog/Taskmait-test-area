import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import { evaluatePrePour } from '@/lib/rules/engine';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const pourId = body?.pourId;
  if (!pourId || typeof pourId !== 'string') {
    return NextResponse.json({ error: 'pourId is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const result = await evaluatePrePour(pourId, supabase);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
