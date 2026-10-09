// The "whose baari" pill: seven stops on a hairline rail under it, top centre, the rail
// filled in haldi up to this section so the pill reads as where the talk has got to. The
// pill sits on the slide's section and, when the player says where it came from
// (?from=<section>), springs across from the previous stop: the carrier between
// sections. Call chrome(tl, id) after building the slide's own timeline.
(function () {
  const W = 840;
  const stopX = (n) => ((n - 1) / 6) * (W - 120) + 60;
  window.chrome = function (tl, id) {
    const T = window.DECK_TIMING;
    const s = T.slides.find((x) => x.id === id);
    const el = document.querySelector(".track");
    if (!el || !s || !s.section) { if (el) el.remove(); return; }
    // the rail: a hairline through the seven stops, haldi up to this section's stop
    const rail = document.createElement("div"); rail.className = "rail"; el.appendChild(rail);
    const fill = document.createElement("div"); fill.className = "fill"; el.appendChild(fill);
    const dots = [];
    for (let n = 1; n <= 7; n++) {
      const i = document.createElement("i");
      i.style.left = stopX(n) + "px";
      if (n <= s.section) i.className = "on";
      el.appendChild(i); dots.push(i);
    }
    // the fill shows slide progress: it reaches this section's stop on the section's first
    // slide and creeps toward the next stop with each slide after it
    const talk = T.slides.filter((x) => x.section);
    const at0 = (x) => {
      const same = talk.filter((y) => y.section === x.section), k = same.indexOf(x);
      const next = x.section < 7 ? stopX(x.section + 1) : stopX(7);
      return stopX(x.section) - stopX(1) + (k / same.length) * (next - stopX(x.section)) * 0.9;
    };
    // progress never runs backwards (slide 14 sits in section 3 but comes after section 4)
    const at = (x) => Math.max(...talk.slice(0, talk.indexOf(x) + 1).map(at0));
    const wNow = at(s), prev = talk[talk.indexOf(s) - 1];
    fill.style.width = Math.max(wNow, 1) + "px";
    const pill = document.createElement("div");
    pill.className = "island";
    pill.innerHTML = `<img src="shared/img/baari-mark.png" alt=""><span>${T.sections[s.section]}</span>`;
    pill.style.left = stopX(s.section) + "px";
    el.appendChild(pill);
    const from = parseInt(new URLSearchParams(location.search).get("from") || "0", 10);
    if (from && from !== s.section) {
      // the carrier: the pill springs from the last stop, the fill runs with it (no spring on the line)
      tl.fromTo(pill, { x: stopX(from) - stopX(s.section) }, { x: 0, duration: 0.65, ease: MOVES.s }, 0);

      dots.forEach((d, k) => { const n = k + 1; if (n > Math.min(from, s.section) && n <= Math.max(from, s.section)) tl.fromTo(d, { backgroundColor: n <= from ? "#F2B705" : "#E4E0D7" }, { backgroundColor: n <= s.section ? "#F2B705" : "#E4E0D7", duration: 0.2, ease: MOVES.e }, 0.05 + 0.4 * (n - Math.min(from, s.section)) / Math.abs(from - s.section)); });
    }
    // every forward step runs the line on from where the last slide left it
    const q = new URLSearchParams(location.search);
    if (prev && !q.has("end") && !q.has("print")) tl.fromTo(fill, { scaleX: Math.max(0, at(prev)) / Math.max(wNow, 1) }, { scaleX: 1, duration: 0.55, ease: MOVES.e }, 0.05);
  };
})();
