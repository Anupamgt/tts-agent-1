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

export async function getClinicInfo(db, args) {
  const loaded = await loadOpenCall(db, args.call_id);
  if (loaded.error) return loaded.error;
  const topic = args.topic;
  if (!topic) {
    return { status: 200, body: { ok: false, error_code: 'missing_topic', say: 'What would you like to know: hours, address, or fees?', next: 'continue' }, events: [] };
  }
  const rows = (await db.query(
    `SELECT topic, answer FROM clinic_info
      WHERE clinic_id = $1 AND lower(topic) = lower($2) AND language = $3`,
    [loaded.call.clinic_id, topic, args.language || 'en'],
  )).rows;
  if (!rows.length) {
    return { status: 200, body: { ok: false, error_code: 'unknown_topic', say: 'I do not have that on file.', next: 'continue' }, events: [] };
  }
  return {
    status: 200,
    body: { ok: true, say: rows[0].answer, data: { topic: rows[0].topic, answer: rows[0].answer }, next: 'continue' },
    events: [],
  };
}
