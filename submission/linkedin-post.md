# LinkedIn post

Attach the demo video (the 2:30 cut, or the 60-second cut). Tag Gnani AI's company page and your teammate. Post it before you submit, because the brief requires the post to be live.

---

When the doctor is busy, the phone still gets answered. 📞

Walk into any small clinic in India and you'll see it: one receptionist checking in patients, taking fees and calming a full waiting room while the landline rings and rings. Each unanswered call is a patient who books elsewhere, makes a wasted trip, or worse, can't get help when it matters.

For The Great Indian AI Internship Challenge by Gnani AI, we built **Deskie**: a voice front desk for Indian clinics.

🗣️ **It speaks the way patients speak.** English, Hindi and Hinglish, often in the same sentence. Gnani AI's Prisma model, trained on Indian phone audio, turns "kal Dr. Sharma ke saath check-up ka time hai?" into something the agent can act on. Gnani's Timbre voice replies naturally, names and times included.

🏥 **It knows the clinic.** 21 live tools connect it to the clinic's records: arrival windows, doctor delays, bookings, report status, refunds, refills and callbacks. Every booking appears on the receptionist's console as it happens.

🛡️ **It's built to be trusted.**
• It knows one phone number can belong to a whole family, and checks who's speaking before sharing anything private
• It never gives medical advice
• Emergencies go straight to a person, with an alert that stays until someone acknowledges it
• A caller can ask for a human at any time

⚙️ **Under the hood:** LiveKit Agents runs the rooms, sessions, tool calls and SIP telephony (Vobiz). Gnani Prisma handles speech to text and Gnani Timbre handles text to speech. A FastAPI clinic backend and a live desk console sit behind it. We tested it with automated voice calls over LiveKit Cloud and AI-played callers, and all 6 scenarios pass, from Hinglish booking to emergency routing.

👉 Talk to Deskie in your browser: https://deskie-clinic.vercel.app/phone
👉 Code and full report: https://github.com/Anupamgt/tts-agent-1

Thank you, Gnani AI, for opening up models built for Indian speech. Building on them showed us how much changes when a voice agent understands India by default.

#GnaniAI #GreatIndianAIInternshipChallenge #VoiceAI #HealthTech #LiveKit #BuildForBharat
