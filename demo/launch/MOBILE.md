# Live call, beside the phone

You are replacing the mock phone shots in `bolnai-demo.mp4` with a real Vobiz call. Same story, same words. One call. The produced mix stays the fallback if the take fails.

## Devices

The call does not arrive on the Mac Mini. The Mini is only the desk software.

- Mac Mini: screen-record the browser window of the Bookings page. Microphone off.
- A borrowed phone: you are the patient. Earphones in, so the assistant cannot hear her own speaker. This is the only phone the camera sees, and only during the dial. Save the Vobiz number as the contact Deskie. Turn on the iPhone screen recording before the tap, and stop it after hang-up. That recording replaces `phone/01-contact.png`, `phone/02-calling.png`, and `phone/03-incall.png`.
- Your own phone, the number in `TRANSFER_TO_NUMBER`: the desk. Face up, Do Not Disturb off, waiting. Do not film your face. When it rings, answer off camera and say: “Deskie desk. I can see the visit on the screen.” A third phone, or any other camera, may film that incoming screen for three seconds. That clip replaces `phone/04-incoming.png`. One phone cannot be both the patient and the desk, because the transfer destination would be busy on the inbound call.

## Preflight

1. Read `PUBLIC_BASE_URL` from `.env`. The tunnel still answers `GET $PUBLIC_BASE_URL/healthz`. Do not put that host in the video.
2. Desk open on Bookings, no `live=1`. Monday 19 Oct. Acknowledge the red emergency banner. Close the Dr Verma delay banner, the failed-messages banner, and the booking-limit banner. Click Retry so the mirror says it is up to date, then hide that banner and the small emergency chip. They are fixture chrome, not this call. Doctor filter: Dr Kaur. Staff on desk: on.
3. One throwaway call. Confirm she says 200 rupees, a card appears, and the desk phone rings. Then record the take.
4. QuickTime, New Screen Recording, the browser window only. Microphone off.

Do not film `http://127.0.0.1:8001/phone`. That page is a debug harness. Do not film the Calls page.

## What you say

Same words as `SCRIPT.md`. If she asks a yes-or-no, the answer is “Yes.” If she asks how you will pay, the answer is “Cash at the desk.” Do not add symptoms, a card number, or a second patient.

1. “What time are you open today?”
2. “I’m a new patient. I’d like to book with Dr Kaur.”
3. “Anika Rao. 12 May 1990.”
4. “Yes. Cash at the desk.”
5. “Clinic ka time Hindi mein bata dijiye.”
6. “Please get me someone from the desk.”

## After the take

Earphones mean the Mac recording has no assistant audio. Download that execution’s recording from Bolna and lay it under the Bookings picture. Sync on the word “book.” `audio/bolnai-demo-mix.mp3` stays the fallback film.

If the raw call is long, drop Hindi first. Keep the fee, the card appearing, and the ring.

## Interview, spoken live, not in the 150 seconds

About twenty seconds, after the film, not a second call. A family number has two files, and a report is spoken only after that person verifies. An emergency is told to ring 112 or 108 and is not booked.
