export function sayForBooking(msg) {
  if (/is full|over capacity|no priority place/.test(msg)) return 'That arrival window is full.';
  if (/requires an appointment fee/.test(msg)) return 'That visit has a fee. I need a clear yes before I can book it.';
  if (/already holds a window/.test(msg)) return 'This call already holds a window.';
  if (/maximum number of upcoming/.test(msg)) return 'That patient already has the maximum number of upcoming visits.';
  if (/daily booking limit/.test(msg)) return 'This phone has reached the daily booking limit.';
  if (/does not offer priority/.test(msg)) return 'That doctor does not offer priority visits.';
  if (/does not run window/.test(msg)) return 'That window is not with the doctor on this booking.';
  if (/not in pool/.test(msg)) return 'That doctor is not in the pool for this booking.';
  return 'I could not save that booking. I can take a callback if you want.';
}

export function mapDbError(err) {
  const msg = err?.message || '';
  const code = err?.code || '';
  if (code === '42501' || /42501|not verified|limited mode/.test(msg)) {
    const limited = /limited mode/.test(msg);
    return {
      ok: false,
      error_code: 'not_verified',
      say: limited
        ? 'A relative can book and check visits, but cannot hear report status or visit history.'
        : 'I need to confirm the file on this call first.',
      next: 'verify',
    };
  }
  if (code === '23505' || /duplicate key|bookings_one_live/.test(msg)) {
    return {
      ok: false,
      error_code: 'duplicate',
      say: 'That patient already has a visit in that window.',
      next: 'continue',
    };
  }
  if (code === 'P0001' || /P0001|is full|requires an appointment fee|already holds|upcoming visits|daily booking|priority|does not run window|not in pool|over capacity/.test(msg)) {
    return { ok: false, error_code: 'booking_rule', say: sayForBooking(msg), next: 'continue' };
  }
  if (code === '23514') {
    return {
      ok: false,
      error_code: 'booking_rule',
      say: 'I could not save that visit. Please confirm the fee and try again.',
      next: 'continue',
    };
  }
  return null;
}

export function toolFailure(err) {
  const mapped = mapDbError(err);
  if (mapped) return { status: 200, body: mapped, events: [] };
  console.error('tool error', err?.code, err?.message);
  return {
    status: 200,
    body: {
      ok: false,
      error_code: 'error',
      say: 'Something went wrong on our side. I can take a callback.',
      next: 'handoff',
    },
    events: [],
  };
}
