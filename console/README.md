# Deskie helpdesk console

Staff console for Deskie. The desk reads the clinic database. `/?sample=1` shows the fictional sample day and does not call the backend.

```bash
node server.js
```

Then open http://localhost:8001 for the sample day, or http://localhost:8001/?live=1 when the API is on port 8000. The phone buttons are at http://localhost:8001/phone.html.

Deploy steps for the Mac Mini are in `docs/deploy-mac-mini.md`.

Demo PINs are shown on the switch-user sheet. Medicine requests follow `docs/flows/11-prescription-refills.md`: only the patient's own doctor sees the medicine and decides (Dr Sharma 2222, Dr Kaur 3333, Dr Verma 4444); reception (Priya 2468) and admins can only mark a request seen or remind the doctor.
