import { columnExists } from './db.js';
import { hashPin, parsePinList } from './pins.js';

export async function seedDevPins(db, config) {
  const pins = parsePinList(config.staffDevPins);
  if (!pins.length) return { applied: 0, column: false };
  const column = await columnExists(db, 'staff_users', 'pin_hash');
  if (!column) {
    console.log('staff PIN column is absent. Apply db/003_staff_auth.sql with psql "$DATABASE_URL" -f db/003_staff_auth.sql. DESK_PIN still gates the receptionist only.');
    return { applied: 0, column: false };
  }
  let applied = 0;
  for (const row of pins) {
    const hash = hashPin(row.pin);
    const res = /^\d+$/.test(row.key)
      ? await db.query(
        `UPDATE staff_users SET pin_hash = $1, pin_updated_at = now()
          WHERE id = $2 AND pin_hash IS NULL RETURNING id, name`,
        [hash, row.key],
      )
      : await db.query(
        `UPDATE staff_users SET pin_hash = $1, pin_updated_at = now()
          WHERE clinic_id = $2 AND name = $3 AND pin_hash IS NULL RETURNING id, name`,
        [hash, config.clinicId, row.key],
      );
    if (res.rows.length) {
      applied += 1;
      console.log(`dev PIN hash set for ${res.rows[0].name}`);
    }
  }
  return { applied, column: true };
}
