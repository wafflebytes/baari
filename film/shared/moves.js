// Motion tokens and moves from film/LOOK.md, shared by the trailer and the deck.
// Every move is a GSAP tween added to a paused timeline at an absolute time, so
// a frame is a pure function of the timeline's time.
(function () {
  const M = {
    EASE: "cubic-bezier(0.22, 1, 0.36, 1)",
    EXIT: "cubic-bezier(0.64, 0, 0.78, 0)",
    SPRING: "cubic-bezier(0.34, 1.36, 0.64, 1)",
    BEAT: 60 / 128,
    ENTER_TRAILER: 0.47,
    ENTER_DECK: 0.52,
    STAGGER: 0.09,
    RISE: 18,
    BLUR: 5,
  };
  M.ease = (cssBezier) => {
    const m = cssBezier.match(/cubic-bezier\(([^)]+)\)/);
    const [x1, y1, x2, y2] = m[1].split(",").map(Number);
    // Newton-Raphson on the x curve, then y: the CSS curve as a GSAP ease.
    const bx = (t) => 3 * x1 * (1 - t) ** 2 * t + 3 * x2 * (1 - t) * t ** 2 + t ** 3;
    const by = (t) => 3 * y1 * (1 - t) ** 2 * t + 3 * y2 * (1 - t) * t ** 2 + t ** 3;
    const dx = (t) => 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * (1 - t) * t + 3 * (1 - x2) * t ** 2;
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let t = p;
      for (let i = 0; i < 8; i++) {
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (bx(t) - p) / d;
        t = Math.min(1, Math.max(0, t));
      }
      return by(t);
    };
  };
  M.e = M.ease(M.EASE);
  M.x = M.ease(M.EXIT);
  M.s = M.ease(M.SPRING);

  // The landing's reveal: fade up 18 px, blur 5 px to 0.
  M.enter = (tl, targets, at, o = {}) =>
    tl.fromTo(
      targets,
      { opacity: 0, y: o.rise ?? M.RISE, x: o.dx ?? 0, filter: `blur(${o.blur ?? M.BLUR}px)` },
      { opacity: 1, y: 0, x: 0, filter: "blur(0px)", duration: o.dur ?? M.ENTER_DECK, ease: M.e, stagger: o.stagger ?? M.STAGGER },
      at,
    );
  M.exit = (tl, targets, at, o = {}) =>
    tl.to(targets, { opacity: 0, y: -(o.rise ?? 12), filter: `blur(${o.blur ?? 4}px)`, duration: o.dur ?? 0.25, ease: M.x, stagger: o.stagger ?? 0 }, at);
  // Springs only for the ब pill and faces.
  M.pop = (tl, targets, at, o = {}) =>
    tl.fromTo(targets, { opacity: 0, scale: o.from ?? 0.6 }, { opacity: 1, scale: 1, duration: o.dur ?? 0.55, ease: M.s, stagger: o.stagger ?? M.STAGGER }, at);
  // Digits roll with the entrance curve and a 2 px blur, no bounce.
  M.count = (tl, el, to, at, o = {}) => {
    const st = { v: o.from ?? 0 };
    const fmt = o.fmt || ((v) => Math.round(v).toLocaleString("en-IN"));
    el.textContent = fmt(st.v);
    return tl.to(st, { v: to, duration: o.dur ?? 0.9, ease: M.e, onUpdate: () => (el.textContent = fmt(st.v)) }, at);
  };
  window.MOVES = M;
})();
