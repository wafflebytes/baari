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
        if (q.has("end") || q.has("print")) tl.progress(1);
        else if (q.has("t")) tl.seek(parseFloat(q.get("t")));
        else if (q.has("play")) tl.play(0);
        document.documentElement.dataset.ready = "1";
      },
    };
    return api;
  };
  // The player talks to the slide: play to the next step, jump to the end, or seek.
  window.addEventListener("message", (e) => {
    const S = window.SLIDE;
    if (!S || !e.data || typeof e.data !== "object") return;
    const { cmd, t } = e.data;
    const now = S.tl.time();
    if (cmd === "next") {
      const nxt = S.steps.find((s) => s > now + 1e-3);
      if (nxt === undefined) return parent.postMessage({ slide: S.id, at: "end" }, "*");
      if (S.tl.isActive()) { S.tl.pause(); S.tl.seek(nxt); }
      else S.tl.tweenTo(nxt);
    } else if (cmd === "end") S.tl.progress(1).pause();
    else if (cmd === "seek") S.tl.seek(t).pause();
    else if (cmd === "start") { S.tl.seek(0).pause(); S.tl.tweenTo(S.steps[0]); }
    parent.postMessage({ slide: S.id, time: S.tl.time(), steps: S.steps }, "*");
  });
})();
