# Demo video script

Two cuts from one recording session:
- **60-second cut**: for the Demo Day Drop award and the social posts.
- **2:30 cut**: the submission video, which shows the full product and the Gnani models in use.

Rules from the brief to respect: show the **application working**, name the **Gnani AI models** used, and **don't stage anything misleading**. Every call below is live; nothing is scripted on Deskie's side.

## Before you record

- [ ] Backend running: PGlite, API with `PUBLIC_DEMO=1`, console, `python agent.py dev` (worker registered), Cloudflare tunnel
- [ ] Vercel open in Chrome: https://deskie-clinic.vercel.app
- [ ] A second window with the desk console signed in: `<tunnel>/?live=1`, PIN `2468`. Clear old demo calls first if you want a clean log
- [ ] Headset mic, quiet room. Speak naturally: Hinglish is the point
- [ ] Screen recorder at 1080p capturing system audio, so Deskie's voice is recorded
- [ ] Do one dry run so LiveKit and Gnani are warm (the first call after a restart is slower)
- [ ] Optional: a terminal with the worker log filtered to `tool ` lines, to show tool calls happening

Layout: browser phone on the left two-thirds, desk console on the right third.

---

## 60-second cut

| Time | On screen | Voice-over / audio |
|---|---|---|
| 0:00–0:05 | A phone ringing, unanswered, on a busy clinic desk (stock clip or your own shot). Text: **"40% of clinic calls go unanswered."** (Alternative text if you have no source for 40%: **"The doctor is busy. The phone keeps ringing."**) | VO: "Small clinics in India miss patient calls every day. We built Deskie to answer them." |
| 0:05–0:10 | Landing page → click **Talk to it in your browser** | VO: "Deskie is a voice front desk, built on Gnani AI." |
| 0:10–0:25 | Demo phone → pick a persona → Deskie greets | **Live audio** of Deskie's greeting (Gnani Timbre, voice Poorvi) |
| 0:25–0:42 | You speak Hinglish: *"Hello, mujhe kal general check-up ke liye appointment chahiye."* Deskie answers in Hinglish. Lower-third: **Gnani Prisma → speech to text · Gnani Timbre → voice** | Live call audio |
| 0:42–0:50 | Cut to the desk console: the new booking appears with source **agent** | VO: "Every booking lands on the receptionist's screen." |
| 0:50–0:55 | You say *"I have chest pain"* → console shows a red **emergency alert** | VO: "Emergencies go straight to a person. No medical advice, ever." |
| 0:55–1:00 | End card: **Deskie** · Gnani Prisma + Timbre · LiveKit · deskie-clinic.vercel.app · #GnaniAI #GreatIndianAIInternshipChallenge | VO: "Deskie. The clinic never misses a call." |

---

## 2:30 cut

### 1. Hook (0:00–0:15)
**On screen:** a busy reception counter, a phone ringing out.
**VO:** "When the doctor is with a patient and the receptionist is at the counter, the phone rings out. That patient books somewhere else. Deskie picks up."

### 2. What it is (0:15–0:30)
**On screen:** landing page, then a slide or the report's architecture diagram.
**VO:** "Deskie is a voice front desk for small Indian clinics. It hears callers with Gnani Prisma, which is trained on Indian phone audio, and speaks with Gnani Timbre. LiveKit runs the call: rooms, the agent, tool calls and the phone line over SIP."

### 3. Call one: Hinglish booking (0:30–1:10)
**On screen:** demo phone, persona **New caller / Unknown**.
**You:** "Hello, mujhe kal general check-up ke liye appointment chahiye."
**Deskie:** asks who it is for, then the name and age.
**You:** "Mera naam Arjun hai, age tees saal."
**Deskie:** creates the file and offers doctors and windows. Accept one.
**Cut to the console:** the booking with source **agent** and the arrival window.
**Optional overlay:** worker log lines `tool register_patient ok`, `tool hold_window ok`, `tool create_booking ok`.
**VO (light):** "Five clinic tools ran behind those two sentences."

### 4. Call two: a known patient and privacy (1:10–1:40)
**On screen:** persona **Meera Demo**.
**You:** "Is my blood test report ready?"
**Deskie:** asks for the full name and card number before answering. Give them, and it reads the status.
**VO:** "Deskie knows the number, but still checks who is speaking before sharing anything private. An unknown caller gets nothing."

### 5. Call three: emergency and a human (1:40–2:05)
**You:** "Mujhe chest mein bahut dard ho raha hai, saans nahi aa rahi."
**Deskie:** gives the emergency line and connects to the desk.
**Cut to the console:** red emergency alert, then a callback with **P1** if nobody accepts.
**VO:** "Emergencies skip the script. Deskie flags it, alerts the desk and gets a person. It never gives medical advice."

### 6. How it's built (2:05–2:20)
**On screen:** architecture diagram, then a quick scroll of the test results (`6/6 scenarios passed`, e2e call pass).
**VO:** "LiveKit Agents with 21 clinic tools, Gnani Prisma and Timbre, a FastAPI clinic backend and the receptionist's console. It's tested with automated voice calls and AI-played callers."

### 7. Close (2:20–2:30)
**On screen:** end card with the URL, the Gnani models used, the hashtags and the team names.
**VO:** "Deskie. Built on Gnani AI for The Great Indian AI Internship Challenge."

---

## Lines to say if something goes wrong while recording

- Deskie mishears: say it again more slowly. Keep the take if the recovery looks natural; it shows real behaviour.
- Long pause: cut it in the edit, and say so in the post ("trimmed pauses"). Don't speed up Deskie's voice.
- The tunnel URL changed: run `deploy/vercel-sync.sh <new-url> --prod` before you record again.
