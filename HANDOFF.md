# Handoff — blind-compare fork of 8values

Fork of [8values](https://github.com/8values/8values.github.io) (MIT). Goal: a
two-person political quiz where the payoff is **comparing how two people read the
same questions**, not just their scores. North star: most quiz "disagreement" is
*interpretation variance*, not *value variance* — surface that, get the "oh, I
didn't read it that way" moment.

License basis: 8values is MIT, so questions/scoring/chart are ours to modify.
politicalcompass.org is closed (copyright bars adaptation) — not used.

## State at this checkpoint

Branch `feat/blind-compare` (off `master`). Not pushed. Not deployed.

Working POC: the **share + blind-compare substrate**. Annotation layer (the real
product) is NOT built yet — see Next steps.

### Flow that works now
1. Alice takes the quiz → results page → "Challenge a friend — copy link"
   button. Link is `quiz.html?c=<Alice's encoded answers>`.
2. Bob opens the link → takes the quiz **blind** (Alice's answers are held in a
   var, never shown — anti-anchoring).
3. Bob's results page shows a **compare card**: Agreement %, a you-vs-them dot
   track per axis, and the biggest-gap axis highlighted with a "real disagreement
   or different reading?" hook.

### Architecture (deliberate)
- **No backend, no accounts, no cost.** All state rides in the URL. Conversation
  passes hand-to-hand like letters; each share is a new URL.
- Answers encode to a **70-char digit string** (one digit per question). Map:
  multiplier `{1, .5, 0, -.5, -1}` ⇄ digit `{4,3,2,1,0}` (`round(m*2)+2`).
  Raw answers (not just scores) are carried so the future annotation layer can
  re-score per-question. Scores are **recomputed** from answers in `results.html`
  using `questions.js` — single source of truth, no score drift.
- URL params on `results.html`: `e,d,g,s` (own axis scores, as before) +
  `a` (own encoded answers) + `c` (challenger's encoded answers, optional).

## Files changed vs upstream
- `quiz.html` — capture raw answer multipliers; read blind `?c=`; pass
  `&a=`/`&c=` to results. Removed ad/statcounter.
- `results.html` — load `questions.js`; decode/recompute challenger; compare card
  (CSS in `<head>`, markup after `<h1>Results</h1>`, logic in main script);
  challenge/copy-link button. Removed ad/statcounter.
- `index.html`, `instructions.html` — removed ad/statcounter only.

## Run locally
```
python3 -m http.server 8418 --directory .
open http://localhost:8418/
```

## Verify (no browser extension needed)
Math + render logic are covered by node checks run against `questions.js`:
- encode→decode round-trips exactly; recomputed scores match the quiz formula.
- agreement = `round(100 - mean(|axis gap|))`; identical answers → 100%.
- render logic picks the right biggest-gap axis and headline threshold.
Inline scripts pass `node --check`. (Re-run by porting the snippets in the commit
message / this session's transcript, or just click through in a browser.)

Browser smoke test via Chrome MCP was blocked — extension not connected. Eyeball
manually instead.

## Known limits / decisions
- Agreement metric is mean axis gap (intuitive, not calibrated). Opposite answers
  land ~89–92% because 8values per-question effects aren't symmetric — expected.
- URL length fine for POC (~150 chars). Messenger truncation (~2k) not a risk yet.
- Privacy: answers live in the link; anyone with the link sees them. Fine for a
  dyad, but state it plainly before any public deploy.
- Compare card uses its own scoped CSS; original 8values bars untouched.

## Next steps (priority order)
1. **Annotation layer** — the actual product. Let the challenger flag a question
   ("ambiguous: 'X' could mean A or B; I answered under B") and have the other
   re-answer just the flagged ones. Depth 1, max 2 readings/question, ~200-char
   note cap. Per-question answers are already in the URL to support this.
2. **Interpretation ranges** — if a question has two readings, a person's score
   becomes a *region*, not a point. Show overlap of the two regions = "agreement
   under best-faith reading."
3. **Deploy** — GitHub Pages on the fork (`debedb/8values`, rename or set Pages to
   `feat/blind-compare`→`master` first) or Vercel static. Both free.
4. **URL→KV migration** — when annotation notes overflow the URL, swap the
   encode/decode layer for a short ID backed by free-tier KV (Upstash/Vercel).
   Encode/decode boundary already isolates this; no rework of the flow.
