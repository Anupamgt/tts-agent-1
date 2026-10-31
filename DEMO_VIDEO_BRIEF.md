# Deskie demo video — context only

This explains the demo. Do not create the video, the audio, the phone frames, or a shot list. Do not change the agent, the console, or the prompts.

## What it is for

Deskie is a submission to the Bolna Symphony buildathon. The demo is a 150-second film of one phone call. Bolna is the voice. This repository is the clinic: hours, fees, bookings, identity, and safety come from our API, not from the model’s memory.

The line we are standing behind: a two-doctor clinic misses the call while the doctor is with a patient, and Deskie picks up. We sell that as overflow answering, not as a replacement for the receptionist.

## What the film shows

One patient, one call, no tour of the product. The picture is the desk on a Mac. The voice is the call. The founder is not on camera.

1. **Hours, with no identity check.** The patient asks what time the clinic is open. The assistant answers from the clinic tool: Monday to Friday 5 to 8 pm, Saturday 10 am to 1 pm, closed Sunday. She does not ask for a name.
2. **A booking, with the fee spoken.** The patient is new. Her name is Anika Rao, born 12 May 1990. She asks for Dr Kaur, the child specialist. The assistant offers 5:00 to 5:30 pm and says the appointment fee is 200 rupees. The patient agrees and pays cash at the desk. The visit then appears on the desk, in Dr Kaur’s 5:00–5:30 window. That appearance is the point of the film.
3. **Hindi, same fact.** The patient asks for the hours in Hindi. The assistant answers in Hindi. This is the language switch, not a second task.
4. **A person at the desk.** The patient asks for someone. The assistant says she is getting the desk, and the founder’s phone rings. Off camera, the desk says they can see the visit. The call does not end on the assistant.
5. **A receipt.** Intent is a booking, the language was Hindi, the caller was a new patient, a booking was made, and it was not an emergency.

## What stays out of these 150 seconds

A family phone with two files, where one person’s report must not be read to the other, and an emergency that is told to ring 112 or 108 and is not booked. Those are for the live interview. Putting them in the film would be a second call and a different story.

## What each device is doing

The call never arrives on the Mac Mini. The Mini only runs the desk.

- The desk on screen is the Bookings page of the staff console, filtered to Dr Kaur, with staff on desk switched on. The phone page in the console is a debug harness and is not part of the film. The Calls page is not the hero, because its summary line is sample copy.
- A borrowed phone is the patient and dials the clinic’s Vobiz number. The film shows that phone only while it dials. The patient wears earphones so the assistant does not hear her own voice from a speaker.
- The founder’s phone is the desk. It is the transfer destination already configured on the agent. It rings at the end. It is answered off camera.

A web call in the browser cannot ring that phone, so the film is a real inbound call, not the mock phone.

## What is already true in the product

The live Bolna agent already has the clinic prompt, the clinic tools, English and Hindi, the Kalpa voice Kiara, the Vobiz number, office ambient noise, call summary, and the extraction fields Intent, Language, Verified, Booking made, and Emergency. A phone call that asks for a person uses Bolna’s transfer to the desk mobile. A browser call uses a different path, where the desk joins in the console. The assistant never greets by name, and she only states a fee or a booking after the tool returns it.

The spoken welcome tells the caller this is the clinic’s automated assistant, that the call is recorded, and that they may speak English or Hindi or ask for the desk. The film uses a short cut of that welcome so the recording disclosure does not use the whole two minutes.

## How to treat this note

Use it as the reason the film is shaped this way. The production prompt, if one is needed later, is a separate file and is not this brief.
