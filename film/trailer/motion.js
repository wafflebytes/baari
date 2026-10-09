// Base44's motion, measured on all 1,200 frames of the reference (film/LOOK.md, "Motion";
// the frames are in film/trailer/look-ref/). This is the only motion a video composition
// may use: no other eases, no blur, no fades or rises on text, no springs.
// scripts/lint-motion.mjs refuses anything else.
//
// Every function adds sets or tweens to a paused GSAP timeline at an absolute time in
// seconds, so any frame is a pure function of time: no callbacks, no randomness except
// the seeded kind below. Frame counts in the comments are the reference's (24 fps).
// Times carry over by the clock, so the reference's 4-frame tick (0.167 s) is 5 of our
// frames at 30 fps.
//
// Usage in a composition:
//   const M = MOTION, tl = gsap.timeline({ paused: true });
//   M.hide("#s05 .w");                       // everything that cuts in starts hidden
//   M.words(tl, M.wordsOf("#line"), 0.25);   // words cut in, one a tick
(function () {
  const F = 1 / 30;
  const M = {
    F,
    FPS: 30,
    BEAT: 60 / 128,
    // Word cut-in. Ref 0-7: "Build", "an", "app" on frames 0, 4, 7. One word a tick.
    TICK: 5 * F,
    // Typing. Ref 218-241 and 1088-1109: 1 to 2 frames a letter, 4 to 7 at a space.
    LETTER: 2 * F,
    SPACE: 5 * F,
    // Cursor blink. Ref 204-217: 7 frames on, 5 off.
    BLINK_ON: 9 * F,
    BLINK_OFF: 6 * F,
    // Landing. Ref 35-47, the card bursting into the website: 10 frames, fast then
    // settling (18, 32, 66, 76, 80, 83, 94, 100%), no overshoot.
    LAND: 12 * F,
    // Gather. Ref 129-133, portraits flying into a row: 4 to 6 frames, straight lines.
    GATHER: 6 * F,
    // The click. Ref 786-798: the cursor glides on in 6 frames and stops; the button goes
    // black to orange in 4 frames; the next thing appears 2 frames after.
    CURSOR: 8 * F,
    COLOUR: 5 * F,
    AFTER_CLICK: 2 * F,
    // The one dissolve. Ref 183-187, logo into footage: 4 frames, once in the whole film.
    DISSOLVE: 5 * F,
    // The only eases. OUT for every landing and gather; IN for the portal's rise and for a
    // camera that speeds up while words arrive (ref 216-232, 799-831); STEP for colour and
    // machine steps.
    OUT: "power2.out",
    IN: "power2.in",
    STEP: "none",
  };

  // Seeded randomness (mulberry32), for the typing rhythm only.
  M.rng = (seed) => {
    let a = typeof seed === "number" ? seed >>> 0 : [...String(seed)].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 2166136261);
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const snap = (t) => Math.round(t * 30) / 30;
  const els = (x) => (typeof x === "string" ? [...document.querySelectorAll(x)] : x instanceof Element ? [x] : [...x]);

  // Start hidden: everything that cuts in. visibility, not opacity, so nothing half-shows.
  M.hide = (targets) => gsap.set(els(targets), { autoAlpha: 0 });

  // Cut. Ref: about 41 of 45 scene changes are hard cuts. Shows (or hides) on one frame.
  M.cut = (tl, targets, at, show = true) => tl.set(els(targets), { autoAlpha: show ? 1 : 0 }, snap(at));

  // Same framing, new state. Ref 15.6 s and 605-621: sketch, wireframe, finished UI in one
  // frame, hard cuts. `a` leaves and `b` arrives on the same frame.
  M.swap = (tl, a, b, at) => {
    M.cut(tl, a, at, false);
    return M.cut(tl, b, at, true);
  };

  // Split helpers. Text is cut into word or letter spans so they can cut in.
  // Letters are grapheme clusters, so Devanagari and the other scripts split correctly.
  const seg = (s, by) => (typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: by }).segment(s)].map((x) => x.segment) : by === "word" ? s.split(/(\s+)/) : [...s]);
  const wrap = (root, by, cls) => {
    const out = [];
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const parts = seg(n.textContent, by).filter((p) => p.length);
          const frag = document.createDocumentFragment();
          let last = null;
          for (const p of parts) {
            // spaces and punctuation ride with the word before them ("sawaal." is one word)
            if (by === "word" && !/[\p{L}\p{N}]/u.test(p) && last) {
              last.textContent += p;
              continue;
            }
            const s = document.createElement("span");
            s.className = cls;
            s.textContent = p;
            frag.appendChild(s);
            out.push(s);
            last = s;
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains("m-caret")) walk(n);
      }
    };
    for (const r of els(root)) walk(r);
    return out;
  };
  M.wordsOf = (root) => wrap(root, "word", "m-w");
  M.lettersOf = (root) => wrap(root, "grapheme", "m-l");

  // Words cut in. Ref 0-7: whole words, full size, full opacity, one every 4 frames, and
  // the line re-centres as each word lands. `o.times` (absolute seconds, one per word)
  // puts each word on the voice instead of the tick. `o.reflow: false` keeps the line's
  // layout fixed (visibility instead of display), for lines that must not move.
  M.words = (tl, words, at, o = {}) => {
    const w = els(words);
    const reflow = o.reflow !== false;
    gsap.set(w, reflow ? { display: "none" } : { visibility: "hidden" });
    let t = at;
    w.forEach((el, i) => {
      t = o.times ? o.times[i] : at + i * (o.each ?? M.TICK);
      tl.set(el, reflow ? { display: "inline" } : { visibility: "inherit" }, snap(t));
    });
    return t;
  };

  // Typing behind a cursor. Ref 218-241: letters one at a time, 1 to 2 frames apart, a
  // longer gap at each space, the cursor solid while typing and blinking when idle.
  // `el` holds the text; the caret is added after it. Options:
  //   seed     the rhythm's seed (default: the text), so a render is repeatable
  //   words    absolute start times, one per word: each word types from its time (voice)
  //   until    keep the caret blinking until this time (default: hide it when done)
  //   lead     blink this long before the first letter (ref 204-217: 0.55 s)
  //   caret    false for no caret (the island types without one)
  //   accent   true for the haldi caret (ref 1088-1150: the tagline's orange cursor)
  // Returns the time the last letter lands.
  M.type = (tl, el, at, o = {}) => {
    const root = els(el)[0];
    const letters = M.lettersOf(root);
    gsap.set(letters, { display: "none" });
    let caret = null;
    if (o.caret !== false) {
      caret = document.createElement("span");
      caret.className = "m-caret" + (o.accent ? " m-accent" : "");
      root.appendChild(caret);
      gsap.set(caret, { autoAlpha: 0 });
    }
    const r = M.rng(o.seed ?? root.textContent);
    let t = at, w = 0, prevSpace = true;
    letters.forEach((l, i) => {
      const space = /^\s+$/.test(l.textContent);
      if (o.words && prevSpace && !space) t = Math.max(t, o.words[w++] ?? t);
      else if (i > 0) t += space ? M.SPACE : M.LETTER + (Math.floor(r() * 3) - 1) * M.F;
      tl.set(l, { display: "inline" }, snap(t));
      prevSpace = space;
    });
    if (caret) {
      if (o.lead) M.blink(tl, caret, at - o.lead, at);
      M.cut(tl, caret, at);
      if (o.until > t) M.blink(tl, caret, t + M.BLINK_ON, o.until, true);
      else M.cut(tl, caret, t + M.F * 4, false);
    }
    return t;
  };

  // Cursor blink. Ref 204-217: 7 frames on, 5 off, starting on.
  M.blink = (tl, caret, from, to, startOff = false) => {
    let t = from, on = !startOff;
    while (t < to) {
      M.cut(tl, caret, t, on);
      t += on ? M.BLINK_ON : M.BLINK_OFF;
      on = !on;
    }
    return M.cut(tl, caret, to, false);
  };

  // Landing. Ref 35-47: a thing turning into the next shot lands in 10 frames,
  // power2.out, no overshoot. `from` and `to` are GSAP vars (x, y, scale, width, left...).
  M.land = (tl, targets, at, from, to, dur = M.LAND) =>
    tl.fromTo(els(targets), { ...from }, { ...to, duration: dur, ease: M.OUT, immediateRender: false }, snap(at));

  // Gather. Ref 129-133: cards fly in straight lines into a row in 4 to 6 frames, all at
  // once. `to` is one vars object, or one per target.
  M.collapse = (tl, targets, at, to, dur = M.GATHER) => {
    const t = els(targets);
    t.forEach((el, i) => tl.to(el, { ...(Array.isArray(to) ? to[i] : to), duration: dur, ease: M.OUT }, snap(at)));
    return at + dur;
  };

  // Camera push. Ref 216-232 and 962-975: the camera moves only while words arrive,
  // speeding up as they come, and stops when they land. `from`/`to` are the camera's vars.
  M.push = (tl, cam, at, until, from, to) =>
    tl.fromTo(els(cam), { ...from }, { ...to, duration: until - at, ease: M.IN, immediateRender: false }, snap(at));

  // The rise. Ref 799-831: what the portal throws out climbs, slow then fast.
  M.rise = (tl, targets, at, dur, from, to) =>
    tl.fromTo(els(targets), { ...from }, { ...to, duration: dur, ease: M.IN, immediateRender: false }, snap(at));

  // The click. Ref 786-798. The cursor glides from `from` to `to` (x, y in px) and stops
  // at `at`; one frame later the button's colour changes in 4 frames (black to the accent,
  // straight through, as the reference goes through a dark red); the next thing should
  // appear at the returned time (2 frames after the colour lands).
  //   cursor   the cursor element (M.cursorSVG gives Base44's arrow)
  //   button   the element whose colour changes; prop defaults to backgroundColor
  M.click = (tl, o) => {
    const at = snap(o.at);
    if (o.cursor) {
      M.cut(tl, o.cursor, at - M.CURSOR - (o.wait ?? 0));
      tl.fromTo(els(o.cursor), { x: o.from.x, y: o.from.y }, { x: o.to.x, y: o.to.y, duration: M.CURSOR, ease: M.OUT, immediateRender: false }, at - M.CURSOR);
    }
    if (o.button) {
      const prop = o.prop || "backgroundColor";
      tl.fromTo(els(o.button), { [prop]: o.colourFrom }, { [prop]: o.colourTo, duration: M.COLOUR, ease: M.STEP, immediateRender: false }, at + M.F);
    }
    return at + M.F + M.COLOUR + M.AFTER_CLICK;
  };

  // Flash montage and glyph morph. Ref 187-203 (sunglasses, metronome, printer, slip) and
  // 294-310 (the glyph's three shapes): a new picture every 4 frames, hard cuts, in place.
  // Each target shows for `o.each` (default one tick); the last one stays if `o.keep`.
  M.flash = (tl, targets, at, o = {}) => {
    const t = els(targets), each = o.each ?? M.TICK;
    t.forEach((el, i) => {
      M.cut(tl, el, at + i * each);
      if (i < t.length - 1 || !o.keep) M.cut(tl, el, at + (i + 1) * each, false);
    });
    return at + t.length * each;
  };
  // A glyph morph is a flash that keeps its last shape.
  M.morph = (tl, targets, at, o = {}) => M.flash(tl, targets, at, { ...o, keep: o.keep ?? true });

  // Colour change on the decisive thing. Ref 793-796: 4 frames, straight through.
  M.colour = (tl, targets, at, vars) => tl.to(els(targets), { ...vars, duration: M.COLOUR, ease: M.STEP }, snap(at));

  // The one dissolve. Ref 183-187: the still logo into footage, 4 frames. Allowed once in
  // the trailer and once in each deck video; the lint counts them.
  M.dissolve = (tl, a, b, at) => {
    tl.fromTo(els(b), { autoAlpha: 0 }, { autoAlpha: 1, duration: M.DISSOLVE, ease: M.STEP, immediateRender: false }, snap(at));
    return tl.to(els(a), { autoAlpha: 0, duration: M.DISSOLVE, ease: M.STEP }, snap(at));
  };

  // Base44's cursor: a black arrow with a white edge, 34 px tall at 1080p (ref 786: 22 px
  // at 720p). Its tip is the element's top-left corner.
  M.cursorSVG = '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M1.5 1.5v27.2l6.6-6.3 4.6 10.4 4.9-2.1-4.5-10.2h9.2z" fill="#15130F" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>';

  // Styles the moves rely on.
  const css = document.createElement("style");
  css.textContent = `
    .m-caret { display: inline-block; width: 0.055em; height: 0.92em; margin-left: 0.04em; vertical-align: -0.12em; background: currentColor; }
    .m-caret.m-accent { background: var(--haldi, #F2B705); }
    /* camera on the cursor (ref 243-263, 419-432): the line starts at the box's left edge
       and grows right until it reaches the box's right edge; from then on the caret holds
       still there and earlier letters push off the left */
    .m-follow { display: flex; justify-content: flex-end; white-space: nowrap; }
    .m-follow > * { flex: none; }
    .m-follow::after { content: ""; flex: 1 1 0; }
    .m-cursor { position: absolute; left: 0; top: 0; width: 26px; height: 34px; z-index: 30; pointer-events: none; }
  `;
  document.head.appendChild(css);

  window.MOTION = M;
})();
