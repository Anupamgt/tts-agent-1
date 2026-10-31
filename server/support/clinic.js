import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function repoRoot() {
  return repo;
}

export async function loadClinic() {
  const db = new PGlite({ extensions: { btree_gist } });
  const files = ['schema.sql', 'seed.sql', '002_runtime.sql', 'seed_runtime.sql', '003_staff_auth.sql'];
  for (const file of files) {
    await db.exec(fs.readFileSync(path.join(repo, 'db', file), 'utf8'));
  }
  return db;
}
