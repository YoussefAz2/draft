import { NextResponse } from 'next/server';
import { players } from '@/data/players';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { chunkArray } from '@/lib/utils/helpers';

export const dynamic = 'force-dynamic';

async function runSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json(
      {
        error:
          'Schema not found. Run the SQL from src/lib/schema.sql in the Supabase SQL Editor, then revisit /api/setup.',
        details: error.message,
      },
      { status: 412 },
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      success: true,
      alreadyConfigured: true,
      playersSeeded: count,
    });
  }

  for (const batch of chunkArray(players, 50)) {
    const { error: insertError } = await supabase.from('players').insert(batch);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }
  }

  const { count: finalCount, error: finalCountError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (finalCountError) {
    return NextResponse.json(
      { error: finalCountError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    alreadyConfigured: false,
    playersSeeded: finalCount ?? players.length,
  });
}

export async function GET() {
  return runSetup();
}

export async function POST() {
  return runSetup();
}
