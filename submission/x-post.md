# X post

Attach the 60-second demo video to the first post. Tag @GnaniAI (confirm the handle on X before posting).

## Thread

**1/**
Small clinics in India miss patient calls every day. The doctor's busy, the receptionist is at the counter, and the phone rings out.

So we built Deskie: a voice front desk that picks up, in English, Hindi and Hinglish.

Built on @GnaniAI 🎙️
#GnaniAI #GreatIndianAIInternshipChallenge

[video]

**2/**
Say "kal Dr. Sharma ke saath check-up ka time hai?" and Deskie:
• hears it with Gnani Prisma (speech to text)
• checks the clinic's real schedule
• books an arrival window
• answers in Gnani Timbre's voice

The booking shows up on the receptionist's screen right away.

**3/**
It's a front desk, not a chatbot on a phone line:
• 21 live clinic tools: bookings, reports, refunds, refills, callbacks
• knows one phone can belong to a whole family
• checks who's speaking before sharing anything private
• emergencies go straight to a person
• never gives medical advice

**4/**
Stack: LiveKit Agents runs the rooms, sessions, tool calls and SIP telephony. Gnani Prisma + Timbre handle the speech. A FastAPI backend and a live desk console sit behind it.

Benchmarked on FLEURS with phone-quality audio: Gnani Prisma makes 55% fewer word errors than whisper-1 across Hindi, Tamil and Kannada (25.7% vs 56.9% WER). It detects the caller's language by itself 95% of the time. Agent pass^3: 85.7% on 14 clinic scenarios.

**5/**
Try it in your browser 👉 https://deskie-clinic.vercel.app/phone
Code 👉 https://github.com/Anupamgt/tts-agent-1

#GnaniAI #GreatIndianAIInternshipChallenge

## Single post (if you don't want a thread)

When the doctor is busy, the phone still gets answered.

Deskie is a voice front desk for Indian clinics. It speaks Hinglish, books visits, checks reports, sends emergencies straight to people and never gives medical advice.

Built on @GnaniAI Prisma + Timbre with LiveKit.

Try it: https://deskie-clinic.vercel.app/phone

#GnaniAI #GreatIndianAIInternshipChallenge
