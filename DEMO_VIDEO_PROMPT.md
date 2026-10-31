# Agent prompt: Deskie 150-second demo

Paste everything below this line into a fresh agent window in `/Users/naksh/tts-agent-1`.

---

You are making the Symphony buildathon demo for Deskie, a phone help desk for a small clinic. Bolna runs the voice. This repo is the clinic. Produce both scopes below. Do not stop at a script. Ship the files.

Do not edit `.cursor/plans/symphony_bolna_pitch_cd965680.plan.md`. Do not commit. Do not print secrets from `.env` (API keys, tokens, the transfer mobile). Do not change `agent/system-prompt.txt` (it is exactly 4096 tokens). After any code change, run `graphify update .` from the repo root.

## What this product is

Deskie answers the phone for Deskie. A caller dials a real Vobiz number. Bolna speaks as a woman (Kalpa, voice Kiara). Our API is the clinic: hours, fees, bookings, identity, and safety come from tools, not from the model’s memory.

Facts the agent is allowed to say, from the database:

- Hours: Monday to Friday 5 to 8 pm, Saturday 10 am to 1 pm, closed Sunday.
- Dr Kaur is the child specialist. Booking her requires a 200 rupee appointment fee. Priority is 500 extra and is not part of this film.
- She never greets by name. A new patient gives a full name and a date of birth, then she can book.
- On a phone call, asking for a person uses Bolna’s native `transfer_call`. The pre-tool line is “Let me get someone from the desk.”
- Hindi and English are both live. Hindi welcome is in `agent/welcome-message-hi.txt`. English welcome is in `agent/welcome-message.txt`.

Clinic name on screen: Deskie. Console doctor names in the fixture UI: Dr Sharma, Dr Verma, Dr Kaur. The seed database uses “Dr Demo Kaur”; the fixture console, which you will film, says Dr Kaur.

## The two scopes

Ship both. They are one pack, not two products.

**Scope A. Produced 150-second film.** You build this on the machine. A judge can press play tonight without a phone.

**Scope B. Live-call runbook plus the real mobile frames.** This is how a human replaces the mock phone shots with a real Vobiz call. Write the runbook, and also build the phone screens into the film so the mp4 is complete even if they never film their hands.

The story in both scopes is one call, in this order:

1. Hours, with no identity check.
2. A new patient books Dr Kaur and hears 200 rupees from the tool, then the visit appears on the desk.
3. One Hindi exchange for the same hours.
4. She transfers to the desk. A person answers one sentence.
5. A receipt: intent, language, booking made.

Leave the family-phone refusal and the 112 / 108 emergency line out of the 150 seconds. Put them in the runbook as a 20-second appendix the human can say at the interview, not as a second call inside the film. A second call breaks the one-story cut.

## Scope A deliverables

Create `demo/launch/` and put all of this in it:

1. `SCRIPT.md` — the shooting script, timed, with picture and sound on every beat. Include the caller lines, the assistant lines, the voiceover, and the desk line, word for word.
2. Separate audio files, one line per file, plus a mixed track:
   - `audio/01-vo-open.mp3`
   - `audio/02-agent-welcome.mp3`
   - `audio/03-caller-hours.mp3`
   - `audio/04-agent-hours.mp3`
   - `audio/05-caller-book.mp3`
   - `audio/06-agent-ask-name.mp3`
   - `audio/07-caller-name.mp3`
   - `audio/08-agent-offer.mp3`
   - `audio/09-caller-yes.mp3`
   - `audio/10-agent-booked.mp3`
   - `audio/11-caller-hindi.mp3`
   - `audio/12-agent-hindi.mp3`
   - `audio/13-caller-desk.mp3`
   - `audio/14-agent-transfer.mp3`
   - `audio/15-ring.mp3` (a short phone ring, generated, about 2.5 seconds)
   - `audio/16-desk-answer.mp3`
   - `audio/17-vo-close.mp3`
   - `audio/bolnai-demo-mix.mp3` (the full 150-second bed, with about 0.35 seconds of silence between turns)
3. Phone stills, PNG, iPhone-sized, in `phone/`:
   - outgoing contact “Deskie”
   - calling
   - in-call
   - incoming call on the desk phone
4. `bolnai-demo.mp4` — 1920×1080, 30 fps, 150 seconds, H.264, AAC stereo. No music bed. No face. No logos you invent.

`ffmpeg` is `/opt/homebrew/bin/ffmpeg`. Neural voices are already installed. Use this interpreter:

`/Users/naksh/tts-agent-1/api/.venv/bin/edge-tts`

Voices, and do not swap them:

- Voiceover: `en-GB-SoniaNeural`, calm, slightly slow. She speaks only the open and the close.
- Clinic assistant, English: `en-IN-NeerjaNeural`.
- Patient, English: `en-IN-PrabhatNeural`.
- Patient, Hindi: `hi-IN-MadhurNeural`.
- Clinic assistant, Hindi: `hi-IN-SwaraNeural`.
- Desk person: `en-IN-NeerjaExpressiveNeural` at a slower rate so she is not the same voice as the assistant.

These are produced voices for the film. In `SCRIPT.md`, say in one line that a real submission call is Kiara on the Vobiz number, and that the human can lay that recording under the same picture later. Do not pretend the mp3 is a Bolna execution recording.

### Exact words

Voiceover open: “This is Deskie, answering the phone for a two-doctor clinic.”

Assistant, trimmed welcome: “Namaste. Deskie. How can I help you?”

Patient: “What time are you open today?”

Assistant: “Monday to Friday, 5 to 8 pm. Saturday, 10 am to 1 pm. Closed Sunday.”

Patient: “I’m a new patient. I’d like to book with Dr Kaur.”

Assistant: “May I have your full name and date of birth?”

Patient: “Anika Rao. 12 May 1990.”

Assistant: “The first window with Dr Kaur is 5:00 to 5:30 pm. The appointment fee is 200 rupees. Shall I book it?”

Patient: “Yes. Cash at the desk.”

Assistant: “Booked. Dr Kaur, today, 5:00 to 5:30 pm. Please arrive at the start of the window. The fee is 200 rupees, cash at the desk.”

Patient: “Clinic ka time Hindi mein bata dijiye.”

Assistant: “सोमवार से शुक्रवार, शाम 5 से 8 बजे। शनिवार, सुबह 10 से 1 बजे। रविवार बंद है।”

Patient: “Please get me someone from the desk.”

Assistant: “Let me get someone from the desk.”

Desk: “Deskie desk. I can see the visit on the screen.”

Voiceover close: “The hours and the fee come from the clinic. The desk already has the visit.”

If the mix runs past 150 seconds, cut the Hindi pair first, then tighten silences. Never cut the words “200 rupees”, the moment the booking card appears, or the ring.

### Picture, timed to the mix

| Time | Picture |
|---|---|
| 0:00–0:06 | Desk, still. Lower third: Deskie · Deskie. Voiceover only. |
| 0:06–0:14 | Phone, full frame. Thumb has tapped Deskie. Trimmed welcome underneath. |
| 0:14–0:32 | Desk. Hours question and answer. No cursor travel. |
| 0:32–1:28 | Same desk. Booking dialogue. At the patient’s “Yes”, cut to the frame where Anika Rao sits in Dr Kaur’s 5:00–5:30 pm window. Hold on that card. |
| 1:28–1:42 | Same desk. Hindi pair. A small “हिंदी” chip is enough. Do not change the whole UI language. |
| 1:42–2:12 | Desk, then the incoming-call phone for the ring and the desk line. The person is not on camera. |
| 2:12–2:30 | A receipt panel you design in the console’s own colours, not a fake Bolna screenshot. Fields: Intent, booking. Language, Hindi. Verified, new patient. Booking made, yes. Emergency, no. Voiceover close. |

Console colours, already in `console/public/console.css`: canvas `#edf2f4`, ink `#13232b`, accent `#0a5c70`, type Anek Latin and Anek Devanagari. Match them. The receipt is a Deskie panel titled “Call receipt”.

### How to capture the desk

The console is already running at `http://127.0.0.1:8001/`. The API is on port 8000. A Cloudflare tunnel is already up. Do not restart or kill them.

Open `http://127.0.0.1:8001/#bookings` with no `live=1`. The `?live=1` snapshot is an empty calendar for today, because the seeded windows are not dated today. The fixture day is the one that looks like a clinic: Monday 19 Oct, staff on desk on, Dr Kaur’s 5:00–5:30 and 5:30–6:00 empty, 6:00–6:30 Kabir, 6:30–7:00 Anaya.

Before the screenshot:

- Click Acknowledge on the red emergency banner. It is sample copy about a different caller. It must not be in the film.
- Close the Dr Verma delay banner, the failed-messages banner, and the booking-limit banner.
- Click Retry so the calendar banner says the mirror is up to date, then hide that banner and the small emergency chip for the shot. They are fixture chrome, not this call.
- Set the doctor filter to Dr Kaur.

Take one still of that grid. Then add Anika Rao, age 36, into Dr Kaur’s 5:00–5:30 pm window through the console’s own New booking drawer (source “Phone call to the desk”, cash at the desk, not a priority visit) and shoot the second still. That second still is the money shot. Use the browser tools. A single screenshot of a dirty page is not the film.

Do not film `http://127.0.0.1:8001/phone`. That page is a debug harness. Do not film the Calls page. Its subtitle is a fixed demo statistic (“31 handled by the agent”) and it does not update with this call.

Crop to the clinic header, the staff-on-desk switch, and Dr Kaur’s row. Scale into 1920×1080 on the canvas colour. Leave the empty right-hand void out of frame.

### Phone screens you build

Design four iPhone frames in HTML, screenshot them, and cut them into the mp4. Status bar at 6:10, full battery, no personal notifications, no real phone number of the founder. The clinic contact is “Deskie”. The incoming-call frame is the same name, with Answer and Decline. These frames are what the film shows. Scope B tells the human how to shoot the real phone and drop those clips on top later.

## Scope B deliverables

Write `demo/launch/MOBILE.md`. It is the human’s sheet, second person, short enough to prop beside the phone. Cover all of this.

Devices. The call does not arrive on the Mac Mini. The Mini is only the desk software.

- Mac Mini: screen-record the browser window of the Bookings page. Microphone off.
- A borrowed phone: the patient. Earphones in, so the assistant cannot hear her own speaker. This is the only phone the camera sees, and only during the dial. Save the Vobiz number as the contact Deskie. Turn on the iPhone screen recording before the tap, and stop it after hang-up. That recording replaces `phone/01` through `phone/03`.
- The founder’s own phone, the number in `TRANSFER_TO_NUMBER`: the desk. Face up, Do Not Disturb off, waiting. Do not film the founder’s face. When it rings, answer off camera and say the desk line. A third phone, or any other camera, may film that incoming screen for three seconds. That clip replaces `phone/04`. One phone cannot be both the patient and the desk, because the transfer destination would be busy on the inbound call.

Preflight, in order:

- Tunnel still answers `GET $PUBLIC_BASE_URL/healthz` (read the URL from `.env`, do not paste the host into the video).
- Desk open on Bookings, banners cleared the same way as Scope A, doctor filter Dr Kaur, staff on desk on.
- One throwaway call. Confirm she says 200 rupees, a card appears, and the desk phone rings. Then record the take.
- QuickTime, New Screen Recording, the browser window only.

Caller lines are the same words as Scope A. If she asks a yes-or-no, the answer is “Yes.” If she asks how they will pay, the answer is “Cash at the desk.” Do not add symptoms, a card number, or a second patient.

Audio of the real call: earphones mean the Mac recording has no assistant audio. After the take, download that execution’s recording from Bolna and lay it under the Bookings picture. Sync on the word “book.” The produced mp3 from Scope A stays the fallback film.

Edit rule: if the raw call is long, drop Hindi first. Keep the fee, the card appearing, and the ring.

Interview appendix, spoken live, not edited into the 150 seconds: a family number has two files, and a report is spoken only after that person verifies; an emergency is told to ring 112 or 108 and is not booked.

## Done when

- `demo/launch/bolnai-demo.mp4` exists, plays, and is within 2 seconds of 150.
- The mix contains “200 rupees”, the Hindi hours, “Let me get someone from the desk”, and both voiceover lines.
- The picture shows the real console twice: once before Anika, once with her in the 5:00–5:30 window.
- The four phone frames are in the film.
- `SCRIPT.md` and `MOBILE.md` match the words in the audio.
- You watched the mp4 through once and fixed any shot that shows the red sample emergency, the Calls page, the debug phone page, a face, or a secret.
