// One statement. Safe to run twice: the second run matches no held rows.
export async function expireHolds(db) {
  const res = await db.query(
    `UPDATE bookings
        SET status = 'cancelled',
            hold_expires_at = NULL,
            cancelled_at = now(),
            cancel_reason = 'hold_expired'
      WHERE status = 'held'
        AND hold_expires_at < now()
      RETURNING id`,
  );
  return res.rows.length;
}

export function startHoldWorker(db, intervalMs) {
  let timer;
  const tick = async () => {
    try {
      const n = await expireHolds(db);
      if (n) console.log(`worker-holds cancelled ${n}`);
    } catch (err) {
      console.error('worker-holds', err.message);
    }
  };
  void tick();
  timer = setInterval(tick, intervalMs);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
