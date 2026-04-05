import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { players } from '../data/players';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Schema not detected in Supabase.');
    console.error(`Open Supabase SQL Editor and run ${schemaPath}.`);
    console.error(`Loaded ${schemaSql.split('\n').length} SQL lines for reference.`);
    console.error(error.message);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(`Schema ready and players already seeded (${count}).`);
    return;
  }

  for (let index = 0; index < players.length; index += 50) {
    const batch = players.slice(index, index + 50);
    const { error: insertError } = await supabase.from('players').insert(batch);

    if (insertError) {
      console.error(insertError.message);
      process.exit(1);
    }
  }

  console.log(`Schema ready. Seeded ${players.length} players.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
