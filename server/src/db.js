import pg from 'pg';

export function createPool(url) {
  const pool = new pg.Pool({ connectionString: url, max: 8 });
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(client);
        await client.query('COMMIT');
        return out;
      } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* already aborted */ }
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export async function withTransaction(db, fn) {
  if (typeof db.transaction === 'function') return db.transaction(fn);
  throw new Error('database has no transaction');
}

export async function columnExists(db, table, column) {
  const rows = (await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column],
  )).rows;
  return rows.length > 0;
}

export async function audit(db, row) {
  await db.query(
    `INSERT INTO audit_log (clinic_id, actor_type, actor_id, action, entity, entity_id, call_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      row.clinic_id,
      row.actor_type,
      row.actor_id ?? null,
      row.action,
      row.entity,
      row.entity_id ?? null,
      row.call_id ?? null,
      JSON.stringify(row.details || {}),
    ],
  );
}
