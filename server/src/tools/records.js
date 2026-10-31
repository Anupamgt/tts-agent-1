import { withTransaction } from '../db.js';
import { toolFailure } from './errors.js';

async function loadOpenCall(db, callId) {
  if (callId == null || callId === '') {
    return { error: { status: 404, body: { ok: false, error_code: 'unknown_call', say: 'I cannot find that call.', next: 'stop' }, events: [] } };
  }
  const rows = (await db.query(`SELECT * FROM calls WHERE id = $1`, [callId])).rows;
  if (!rows.length) {
    return { error: { status: 404, body: { ok: false, error_code: 'unknown_call', say: 'I cannot find that call.', next: 'stop' }, events: [] } };
  }
  if (rows[0].phase === 'ended') {
    return { error: { status: 200, body: { ok: false, error_code: 'call_closed', say: 'This call has ended.', next: 'stop' }, events: [] } };
  }
  return { call: rows[0] };
}

function reportSay(row) {
  const label = String(row.label).toLowerCase();
  if (row.status === 'ready_for_pickup') return `Your ${label} is ready to collect at the desk.`;
  if (row.status === 'collected') return `Your ${label} was already collected.`;
  if (row.status === 'pending') return `Your ${label} is not ready yet.`;
  return `Your ${label} is ${row.status}.`;
}

export async function getReportStatus(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    const rows = await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, false)`, [call.id, call.patient_id]);
      return (await tx.query(
        `SELECT label, status FROM lab_orders WHERE patient_id = $1 ORDER BY ordered_on DESC`,
        [call.patient_id],
      )).rows;
    });
    const reports = rows.map((row) => ({ label: row.label, status: row.status }));
    if (!reports.length) {
      return {
        status: 200,
        body: {
          ok: true,
          say: 'I do not have a report on this file. I can share the clinic hours or address if that helps.',
          data: { reports: [] },
          next: 'continue',
        },
        events: [],
      };
    }
    return {
      status: 200,
      body: { ok: true, say: reports.map(reportSay).join(' '), data: { reports }, next: 'continue' },
      events: [],
    };
  } catch (err) {
    return toolFailure(err);
  }
}

export async function getPreviousInteractions(db, args) {
  try {
    const loaded = await loadOpenCall(db, args.call_id);
    if (loaded.error) return loaded.error;
    const call = loaded.call;
    const rows = await withTransaction(db, async (tx) => {
      await tx.query(`SELECT require_verified_patient($1, $2, false)`, [call.id, call.patient_id]);
      return (await tx.query(
        `SELECT happened_on::text AS happened_on, kind, summary, doctor_name
           FROM patient_interactions
          WHERE patient_id = $1
          ORDER BY happened_on DESC
          LIMIT 5`,
        [call.patient_id],
      )).rows;
    });
    const interactions = rows.map((row) => ({
      happened_on: String(row.happened_on).slice(0, 10),
      kind: row.kind,
      summary: row.summary,
      doctor_name: row.doctor_name,
    }));
    const say = interactions.length
      ? interactions.map((row) => row.summary).join(' ')
      : 'I do not have an earlier visit or call on this file.';
    return { status: 200, body: { ok: true, say, data: { interactions }, next: 'continue' }, events: [] };
  } catch (err) {
    return toolFailure(err);
  }
}
