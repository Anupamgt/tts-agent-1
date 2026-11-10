# The phone that never rings out: building a Hinglish voice front desk for Indian clinics

*How we built Deskie on Gnani AI's speech models and LiveKit Agents, and what it took to make a voice agent a small clinic could trust.*

---

## The call nobody picks up

At 11:40 on a weekday morning, a small clinic in an Indian town is at its busiest. The doctor is with a patient. The receptionist is checking someone in, writing a receipt and telling a worried parent the doctor will be "bas das minute" late. The landline rings and nobody can reach it.

On the other end is someone who wanted to book a check-up, ask if their report is ready, or find out whether to leave home yet. Most will try another clinic. Some will turn up and wait an hour. Rarely, it's someone in real trouble.

The software on offer doesn't fit these clinics. IVR menus fall apart the moment a caller says *"kal Dr. Sharma ke saath general check-up ka time hai kya?"* Hospital call centres are priced for hospitals. Chatbots don't answer phones.

So for **The Great Indian AI Internship Challenge** by Gnani AI, we built the thing that answers: **Deskie**, a voice front desk for Indian clinics.

## What Deskie does

Deskie answers the clinic's phone, or a browser call from the clinic's website, and handles what a receptionist handles:

- **Bookings** in *arrival windows*, the way Indian OPDs run, plus changes and cancellations
- **"Is the doctor late?"** answered from today's real check-ins
- **Report status**, after checking who is calling
- **Messages, refill requests, refunds and payment links**, logged as tickets for the clinic to decide on
- **A human, any time.** Deskie pages the desk, and if nobody is free it books a callback with the right priority
- **Emergencies** skip the script: Deskie flags the call, alerts the desk and connects a person

Everything Deskie does appears on the **desk console**, the receptionist's live screen: queue, doctor delays, agent-made bookings, callbacks and red emergency alerts.

## Why speech built for India matters

Our first lesson was that the speech layer decides everything. If the agent mishears, every tool call after that is wrong.

We built on **Gnani AI's Prisma v2.5** for speech to text. It's trained on millions of hours of real phone audio, and it handles what Indian callers actually say. A Hinglish test sentence came back as:

> *"namaste mujhe kal doctor sharma ke saath appointment book karni hai"*

That's clean, natural Roman-script Hinglish, which the LLM can work with directly. We also tried `hi-IN`, which returns exact Devanagari, and settled on `en-IN` streaming because mixed speech comes out in the form the reasoning model handles best.

For the voice we used **Gnani Timbre v2.5** with the **Poorvi** voice, which is designed for Hinglish. Indian names, times and rupee amounts sound right without any SSML tricks. We stream it over SSE so Deskie starts speaking before the whole sentence is ready.

One thing to watch: we tried passing two languages at once (`en-IN,hi-IN`), and the default model rejects that with `INVALID_LANGUAGE_CODE`. Mixed-language input needs Prisma v3's `indic-auto` mode, which is on our roadmap.

## Why LiveKit runs the call

Speech is half the problem. The other half is running the call: rooms, sessions, turn-taking, interruptions, tool calls, hanging up and phone lines. We used **LiveKit Agents** for all of it.

- **Agent:** a named worker (`deskie`) registered to LiveKit Cloud in India South
- **Rooms:** one per call. The browser demo gets a token whose room config dispatches Deskie automatically. A phone call arrives through a **Vobiz SIP trunk** and a dispatch rule
- **Sessions:** `AgentSession` with Silero VAD and LiveKit's multilingual turn detector, so Deskie waits when a caller pauses mid-sentence
- **Tools:** 21 function tools generated from one JSON schema file, which a static checker also validates against the prompt and backend (91 checks)
- **Memory:** the session's chat history is the call's working memory. Past calls come back through a tool, and the full transcript goes to the backend when the call ends
- **Telephony:** a setup script creates the SIP inbound trunk (with Krisp noise cancellation), the dispatch rule, an outbound trunk for reminder calls, and SIP transfer for handing over to a person

```text
Caller ──(PSTN)── Vobiz SIP ──┐
Browser ──(WebRTC)────────────┴──► LiveKit Cloud room ◄──► Deskie worker
                                                             │  Gnani Prisma (STT)
                                                             │  LLM + 21 tools ──► Clinic API ──► Postgres
                                                             │  Gnani Timbre (TTS)          └──► Desk console
```

## Making it trustworthy

A clinic will only switch on a voice agent it can trust, so we treated safety as a feature with release-blocking limits:

1. **Shared family phones.** In India, one number often belongs to a parent, two children and a grandparent. Deskie looks up every patient file on the number and asks who it's speaking to before opening any of them.
2. **Verification before private details.** Report status needs a name plus a date of birth or card number. Our evals check that an unknown caller gets nothing.
3. **No medical advice, ever.** Medical questions get a fixed, clinic-approved line and an offer to take a message for the doctor.
4. **Emergencies go to people.** Chest pain or breathlessness means `flag_emergency` and `request_human`, with an alert that stays on the console until someone acknowledges it.
5. **Rules live on the server.** Refill and refund decisions are made by the clinic, not the model.

## How we tested it

We didn't want a demo that only works once. We built two kinds of automated tests:

**Voice calls end to end.** A bot caller joins a real LiveKit Cloud room and speaks through Gnani Timbre. Deskie hears it through Prisma, calls tools and answers by voice, and we read the live transcription stream. Here is one real Hinglish run:

> **Caller:** Hello, mujhe kal general check-up ke liye appointment chahiye.
> **Deskie:** Aap naye patient hain. Kya aap mujhe batayenge ki appointment kis ke liye chahiye? Aapka poora naam aur janm ki tareekh (ya umar) bataiye.
> **Caller:** Mera naam Arjun Test hai, meri age tees saal hai.
> **Deskie:** Maine aapka file bana diya hai aur main aapko patient id SMS ke zariye bhej dungi…

**Conversation evals.** A second LLM plays a caller with a persona and a goal, against the real prompt, tools and database. There are 14 scenarios across English, Hindi, Hinglish, Tamil and Kannada, each run three times, scored the τ-bench way: pass^3 counts a scenario only if all three runs succeed. We get **pass@1 88.1% and pass^3 85.7%**. What still fails is in the numbers: a Tamil new-patient booking works 1 time in 3, and a Bengali caller doesn't get a callback yet.

**Speech benchmarks.** We ran Google's FLEURS test set in Hindi, Tamil and Kannada three ways: clean, squeezed through an 8 kHz μ-law phone line, and phone plus waiting-room babble at 10 dB SNR. The same clips went to Gnani Prisma and to OpenAI's whisper-1.

| Mean WER, Hindi + Tamil + Kannada | Prisma v2.5 | whisper-1 |
|---|---|---|
| Phone line | **25.7%** | 56.9% |
| Phone + babble | **35.3%** | 77.7% |

That's 55% fewer word errors on the audio a clinic actually receives. Prisma v3.0's `indic-auto` mode named the language correctly 95% of the time without being told, which is what lets one number serve every caller. Live over LiveKit Cloud, end-of-turn detection takes 0.65 s, the LLM's first token 1.1 s and Timbre's first audio 0.17 s (medians over 8 calls).

Testing found real bugs:
- **The model read an internal label aloud** ("DATA LINE: …"). We added a streaming filter in the TTS and transcription path.
- **Up to 25 seconds of silence** while the desk was being paged. Deskie now says *"Please stay on the line, I'm connecting you to the desk"* first.
- **Our tunnel made every internet request look local**, which would have opened the desk API. We fixed that before deploying, with unit tests.

## What's next

- **Evon v3.3 as the brain.** Our LLM slot is an OpenAI-compatible client built for Gnani's open-weight Evon v3.3, with its thinking switch exposed. The live demo uses gpt-4o-mini through the same slot, because a 30B model doesn't fit our laptop GPU. Self-hosting Evon with vLLM would put the whole call on Indian models, on infrastructure the clinic controls.
- **Prisma v3 `indic-auto`**, so a Tamil, Kannada or Bengali caller is answered in their own language.
- **Outbound reminder and report-ready calls** over the same SIP trunk.
- **A pilot** with real clinics, measured by one number: **saved calls**, the calls a busy desk would have missed that still ended in the right outcome.

## Try it

📞 Talk to Deskie in your browser: **https://deskie-clinic.vercel.app/phone**
💻 Code and full technical report: **https://github.com/Anupamgt/tts-agent-1**

Built on Gnani AI's Prisma and Timbre, with LiveKit, for The Great Indian AI Internship Challenge.

*#GnaniAI #GreatIndianAIInternshipChallenge*
