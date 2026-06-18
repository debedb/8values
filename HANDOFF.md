# Handoff — blind-compare fork of 8values

Fork of [8values](https://github.com/8values/8values.github.io) (MIT). Goal: a
two-person political quiz where the payoff is **comparing how two people read the
same questions**, not just their scores. North star: most quiz "disagreement" is
*interpretation variance*, not *value variance* — surface that, get the "oh, I
didn't read it that way" moment.

License basis: 8values is MIT, so questions/scoring/chart are ours to modify.
politicalcompass.org is closed (copyright bars adaptation) — not used.

## State at this checkpoint

Branch `feat/blind-compare` (off `master`).

Working: **share + blind-compare substrate AND the annotation layer** (the real
product). Both verified in a real browser. Deploy target chosen: GitHub Pages on
`debedb/8values` master.

### Flow that works now
1. Alice takes the quiz → results → "Challenge a friend — copy link"
   (`quiz.html?t=<thread>`).
2. Bob opens the link → takes the quiz **blind** (Alice's answers are held in the
   thread, never shown — anti-anchoring).
3. Bob's results show the **compare card**: Agreement %, a you-vs-them dot track
   per axis, biggest-gap axis highlighted.
4. **Annotation:** on the compare view either person can **flag** a question they
   read differently and add a ~200-char note. "Send back — copy link" hands the
   conversation to the other person, who re-answers **only the flagged questions**
   (their note shown, anti-anchoring kept), then compares again. Unbounded rounds
   — the conversation can run many turns back and forth.

## Architecture (deliberate)
- **No backend, no accounts, no cost.** All state rides in the URL. Conversation
  passes hand-to-hand like letters; each send is a new URL.
- One **thread** carries everything, in `?t=`. A thread is an ordered list of
  rounds (`compare.js`):
  `round = { p: 0|1, a: "<70-digit answers>", f: [ { q: <index>, n: "<note>" } ] }`
  `p` participant (0 initiator / 1 challenger), `a` that person's full answers,
  `f` flags they raised that round. Round N re-answers round N-1's flags and may
  raise new ones. The viewer on `results.html` is the author of the latest round;
  the "other" is the latest round by the opposite participant.
- Answers encode to a **70-char digit string** (one digit per question). Map:
  multiplier `{1, .5, 0, -.5, -1}` ⇄ digit `{4,3,2,1,0}` (`round(m*2)+2`). Raw
  answers (not just scores) are carried so re-answers re-score cleanly. Scores are
  **recomputed** from answers using `questions.js` — single source of truth.
- Thread codec: `encodeThread` = `JSON.stringify`; the URL layer applies
  `encodeURIComponent` at link-build time and `getParam` strips that one decode
  pass — so `encodeThread`/`decodeThread` are pure inverses (don't double-encode).

## Files changed vs upstream
- `compare.js` — **new.** Shared substrate: URL param read, answer codec, scoring
  (`scoreFromAnswers`), `agreement`, and the thread model
  (`encodeThread`/`decodeThread`/`participantLatest`/`nextParticipant`/`openFlagsFor`).
  Included by both quiz and results. Has a CommonJS hook so the math is
  node-checkable headlessly.
- `quiz.html` — three modes off `?t=`: solo round 0 (all 70), blind round 1
  (all 70, hidden), **annotate** (only the other person's flagged questions, note
  shown, seeded from this taker's prior answers). Appends its round, hands to
  results. Also a round-0 length choice: full quiz vs a random 5-question sample;
  the chosen set is stored on round 0 (`.q`) so every later taker answers the same
  questions. Removed ad/statcounter.
- `results.html` — thread-driven: recompute bars/labels/ideology/banner from the
  viewer's answers; compare card vs the other participant; **flag composer**
  (question picker + 200-char note), **flag transcript**, and the send-back /
  challenge link. Dropped the old `a`/`c`/`e,d,g,s` params and the duplicated
  helpers (now in `compare.js`). Removed ad/statcounter.
- `index.html` — added an intro card (fork-of-8values, what's different, the
  4-step flow, privacy) + removed ad/statcounter.
- `instructions.html` — removed ad/statcounter only.

## Run locally
```
python3 -m http.server 8418 --directory .
open http://localhost:8418/
```

## Verify
Math + thread logic — node checks against `questions.js` + `compare.js`
(`/tmp/cmp_test.js`, `/tmp/e2e.js` in the build session):
- answer codec round-trips; identical → 100%; all-neutral → 50/50/50/50;
  opposite → 92% (8values per-question effects aren't symmetric — expected).
- E2E multi-turn: round0 P0 → blind round1 P1 → flag → annotate round2 P0
  re-answers only flagged, unflagged preserved → round3 possible.
- inline scripts pass `node --check`.

Browser smoke — **Playwright** (Chrome MCP extension was not connected; Playwright
MCP needs no extension). Full loop driven headless, zero console errors: solo →
blind challenge → compare card (87%) → flag composer (select/note/add/pending/
send-link) → annotate retake (only flagged Q, note shown, seed preserved) →
compare updates (88%) + transcript. Re-run by serving locally and repeating, or
port the snippets from the session transcript.

## Known limits / decisions
- Agreement metric is mean axis gap (intuitive, not calibrated). Opposite answers
  land ~89–92% because 8values per-question effects aren't symmetric — expected.
- URL length: thread is JSON, so it grows with rounds and note text. Fine for a
  POC; the documented fix is URL→KV (below).
- Privacy: the whole conversation lives in the link; anyone with the link sees
  every answer and note. Stated in the index intro. Fine for a dyad.
- Flagging only appears on the compare view (you must have someone to compare
  with). A solo results page shows only "Challenge a friend" — by design.
- Tooling note (build session): the shell had `errexit` that aborted on `grep`
  no-match, and `Grep`/Chrome-MCP tools were unavailable — used `node` for file
  scans and Playwright for the browser smoke.

## Next steps (priority order)
1. **Deploy** — GitHub Pages on `debedb/8values` master (chosen).
   NOTE: `gh` resolves to the **upstream** `8values/8values.github.io` by default;
   always pass `--repo debedb/8values` for PR/Pages so nothing targets upstream.
2. **Interpretation ranges** — if a question has two readings, a person's score
   becomes a *region*, not a point. Show overlap of the two regions = "agreement
   under best-faith reading."
3. **URL→KV migration** — when threads/notes overflow the URL, swap the
   encode/decode layer (`compare.js`) for a short ID backed by free-tier KV
   (Upstash/Vercel). The encode/decode boundary is already isolated.
4. **Improve question wording / flag prompts** — refine copy later.
