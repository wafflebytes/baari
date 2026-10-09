// One slide = one composition with one paused GSAP timeline, registered on
// window.__timelines under the slide id. Build steps (where the talk waits for
// a press) come from timing.js. The player (deck.html) drives slides through
// postMessage; ?end shows the final frame, ?t=<s> any instant, for export.
(function () {
  window.__timelines = window.__timelines || {};
  const q = new URLSearchParams(location.search);
  window.deckSlide = function (id) {
    const tl = gsap.timeline({ paused: true });
    const T = (window.DECK_TIMING && window.DECK_TIMING.slides.find((s) => s.id === id)) || { steps: [] };
    const api = {
      tl,
      T,
      // a build step's start time in the slide timeline
      at: (i) => T.steps[i] ?? 0,
      done() {
        window.__timelines[id] = tl;
        const end = tl.duration();
        const steps = [...T.steps.filter((s) => s > 0 && s < end), end];
        window.SLIDE = { id, tl, steps, end };
        if (q.has("print") || q.has("thumb")) document.querySelectorAll("video").forEach((v) => { v.removeAttribute("src"); v.load(); });
        if (q.has("end") || q.has("print") || q.has("thumb")) tl.progress(1);
        else if (q.has("t")) tl.seek(parseFloat(q.get("t")));
        else if (q.has("play")) tl.play(0);
        document.documentElement.dataset.ready = "1";
      },
    };
    return api;
  };
  // The player talks to the slide. "next" plays to the next stop; if a build is still
  // playing, it finishes it at once instead (complete, then advance). "prev" goes back one
  // stop, landing on it at once. Past either end the slide tells the player to change
  // slides. Only one play tween ever drives the timeline, so presses can't fight.
  let run = null;
  const stop = () => { if (run) { const to = run.vars.time; run.kill(); run = null; return to; } return null; };
  const playTo = (S, t) => { run = S.tl.tweenTo(t, { onComplete: () => { run = null; tell(S); } }); };
  const tell = (S) => parent.postMessage({ slide: S.id, time: S.tl.time(), steps: S.steps }, "*");
  window.addEventListener("message", (e) => {
    const S = window.SLIDE;
    if (!S || !e.data || typeof e.data !== "object") return;
    const { cmd, t } = e.data, eps = 1e-3;
    if (cmd === "next") {
      const to = stop();
      if (to !== null) { S.tl.seek(to).pause(); return tell(S); }
      const nxt = S.steps.find((s) => s > S.tl.time() + eps);
      if (nxt === undefined) return parent.postMessage({ slide: S.id, at: "end" }, "*");
      playTo(S, nxt);
    } else if (cmd === "prev") {
      stop();
      const now = S.tl.time();
      const back = [...S.steps].reverse().find((s) => s < now - eps);
      if (back === undefined) return parent.postMessage({ slide: S.id, at: "start" }, "*");
      S.tl.seek(back).pause();
    } else if (cmd === "end") { stop(); S.tl.progress(1).pause(); }
    else if (cmd === "seek") { stop(); S.tl.seek(t).pause(); }
    else if (cmd === "start") { stop(); S.tl.seek(0).pause(); playTo(S, S.steps[0]); }
    tell(S);
  });
})();
