# Test run log

One section per round of testing. For each case: what happened, pass or fail, and what we changed in the system prompt because of it. Raw tool logs are exported from https://baari-rails.vercel.app/admin (call log) and the AgenticOrg run timeline.

## Round 0: rails smoke test (2026-10-03, before any agent run)
Checked every connector directly, without the agent.
- Delhivery mock: serviceable and non-serviceable pincodes, shipment create, unknown warehouse rejected, tracking normal, `delayed` once then back to normal, `malformed` returns a cut-off body, hyperlocal assigned and `no_rider`. All behaved as designed.
- Pine Labs mock: balance read, debit over balance refused with INSUFFICIENT_BALANCE_FOR_SBMD_PRESENTATION, debit PENDING then SUCCESS, payee not on the list refused with PAYEE_NOT_ALLOWED, kirana payee accepted.
- Gnani (real): TTS Hindi to OGG, then STT of that audio returned the same sentence in 0.4s.
- Telegram (real): bot token valid, webhook set.
- Google Sheet (real): read Config through the connector.
No prompt changes (no agent yet).
