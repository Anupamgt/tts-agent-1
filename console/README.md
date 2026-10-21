# Bolnai helpdesk console

Staff console for Demo Family Clinic. The UI follows `docs/design/claude-design-handoff.md` and the tokens and components in `design-system/`. Sample data only — nothing here calls a backend.

```
npm start
```

Then open http://localhost:8001

Demo PINs are shown on the switch-user sheet. Medicine requests follow `docs/flows/11-prescription-refills.md`: only the patient's own doctor sees the medicine and decides (Dr Sharma 2222, Dr Kaur 3333, Dr Verma 4444); reception (Priya 2468) and admins can only mark a request seen or remind the doctor.
