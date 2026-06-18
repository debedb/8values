// Shared blind-compare + annotation substrate for the 8values fork.
// No backend: all state rides in the URL. Included by quiz.html and results.html.
// Depends on the global `questions` array (questions.js) for scoring.

// ---- URL params -----------------------------------------------------------
function getParam(name) {
    var query = window.location.search.substring(1)
    var vars = query.split("&")
    var retval = ""
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=")
        if (pair[0] == name) {
            retval = decodeURIComponent(pair[1])
            break
        }
    }
    return retval
}

// ---- Answer <-> digit codec ----------------------------------------------
// One digit per question. Multiplier {1, .5, 0, -.5, -1} <-> digit {4,3,2,1,0}.
function encodeAnswers(arr) {
    var retval = arr.map(function (m) { return String(Math.round(m * 2) + 2) }).join("")
    return retval
}

function decodeAnswers(str) {
    var retval = []
    for (var i = 0; i < str.length; i++) {
        retval.push((Number(str[i]) - 2) / 2)
    }
    return retval
}

// ---- Scoring (single source of truth: same formula as the quiz) -----------
function calcScore(score, max) {
    var retval = (100 * (max + score) / (2 * max)).toFixed(1)
    return retval
}

// Recompute the four axis scores from a decoded answer array.
function scoreFromAnswers(ans) {
    var me = 0, md = 0, mg = 0, ms = 0
    var fe = 0, fd = 0, fg = 0, fs = 0
    for (var i = 0; i < questions.length; i++) {
        me += Math.abs(questions[i].effect.econ)
        md += Math.abs(questions[i].effect.dipl)
        mg += Math.abs(questions[i].effect.govt)
        ms += Math.abs(questions[i].effect.scty)
        var m = ans[i] || 0
        fe += m * questions[i].effect.econ
        fd += m * questions[i].effect.dipl
        fg += m * questions[i].effect.govt
        fs += m * questions[i].effect.scty
    }
    var retval = {
        econ: Number(calcScore(fe, me)),
        dipl: Number(calcScore(fd, md)),
        civil: Number(calcScore(fg, mg)),
        scty: Number(calcScore(fs, ms))
    }
    return retval
}

// Mean-axis-gap agreement, 0..100. Identical answers -> 100.
function agreement(you, them) {
    var keys = ["econ", "dipl", "civil", "scty"]
    var total = 0
    for (var i = 0; i < keys.length; i++) {
        total += Math.abs(you[keys[i]] - them[keys[i]])
    }
    var retval = Math.round(100 - total / keys.length)
    return retval
}

// ---- Conversation thread --------------------------------------------------
// A thread is an ordered array of rounds ("letters"), alternating participants.
//   round = { p: 0|1, a: "<70-digit answers>", f: [ { q: <index>, n: "<note>" } ] }
// p  - participant id (0 = initiator, 1 = challenger)
// a  - that participant's FULL current answers (re-answers just change digits)
// f  - flags this participant raised this round (questions they read differently)
// Round N is expected to re-answer the flags raised in round N-1, and may raise
// new flags of its own. Depth is unbounded -> the conversation can run many turns.

// encodeThread/decodeThread are pure JSON inverses. The URL layer is applied
// separately: build links with encodeURIComponent(encodeThread(t)); getParam()
// already strips that one decode pass before you call decodeThread().
function encodeThread(thread) {
    var retval = JSON.stringify(thread)
    return retval
}

function decodeThread(str) {
    var retval = []
    if (str) {
        retval = JSON.parse(str)
    }
    return retval
}

// Latest round authored by participant p (or null).
function participantLatest(thread, p) {
    var retval = null
    for (var i = thread.length - 1; i >= 0; i--) {
        if (thread[i].p === p) {
            retval = thread[i]
            break
        }
    }
    return retval
}

// Whose turn is next: the participant who did NOT author the last round.
// Empty thread -> 0 (initiator goes first).
function nextParticipant(thread) {
    var retval = 0
    if (thread.length > 0) {
        retval = thread[thread.length - 1].p === 0 ? 1 : 0
    }
    return retval
}

// Open flags a given viewer must address: the flags raised in the OTHER
// participant's most recent round. Each carries the question index and note.
function openFlagsFor(thread, viewerP) {
    var otherP = viewerP === 0 ? 1 : 0
    var last = participantLatest(thread, otherP)
    var retval = (last && last.f) ? last.f : []
    return retval
}

// Node/CommonJS hook so the math can be unit-checked headlessly.
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        encodeAnswers: encodeAnswers,
        decodeAnswers: decodeAnswers,
        calcScore: calcScore,
        scoreFromAnswers: scoreFromAnswers,
        agreement: agreement,
        encodeThread: encodeThread,
        decodeThread: decodeThread,
        participantLatest: participantLatest,
        nextParticipant: nextParticipant,
        openFlagsFor: openFlagsFor
    }
}
