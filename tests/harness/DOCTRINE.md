# Harness verification doctrine

The harness in this directory (embedded-pg real-save-path integration tests, per-standard seeders)
exists to produce **VA-grade** proof: a chain's live persisted result verified against the
authoritative source PDF.

**The binding rules live in `../../docs/verification-doctrine.md` — read it in full and paste it
VERBATIM into every subagent brief.** In short, for harness work specifically:

- A GREEN run proves the **math**, not the **input** (SR-1). Every corrected input value cited in a
  test must carry its verbatim PDF-page source, not just the expected output.
- `standard_fixed` values are read from the PDF (page ref required); `standard_range` values are
  engineer selections (SR-2); `derived` values must never be hand-enterable (the #22 class);
  `engineer_input` is project data the standard never states.
- Every "test passes / value persists" claim is backed by pasted **raw** vitest / SQL read-back output.
- Reader pipeline: scoop `pdftotext -layout` via PowerShell (WSL is blind to the FLL PDF folder);
  the Read tool's `pdftoppm` is rejected on this box.
- Prod is read-only from the harness; real prod writes go through the Management-API path.
