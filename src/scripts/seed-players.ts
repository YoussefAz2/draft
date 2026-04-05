import { createClient } from '@supabase/supabase-js';
import { players } from '../data/players';

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error(countError.message);
    process.exit(1);
  }

  if (count && count > 0) {
    console.log('Players already seeded');
    return;
  }

  for (let index = 0; index < players.length; index += 50) {
    const batch = players.slice(index, index + 50);
    const { error } = await supabase.from('players').insert(batch);

    if (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }

    console.log(`Seeded ${Math.min(index + 50, players.length)}/${players.length}`);
  }

  console.log('✅ Done!');
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
