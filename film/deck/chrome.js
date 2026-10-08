// The "whose baari" pill: seven stops on a hairline track, top centre. The pill
// sits on the slide's section and, when the player says where it came from
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
    for (let n = 1; n <= 7; n++) {
      const i = document.createElement("i");
      i.style.left = stopX(n) + "px";
      el.appendChild(i);
    }
    const pill = document.createElement("div");
    pill.className = "island";
    pill.innerHTML = `<img src="shared/img/baari-mark.png" alt=""><span>${T.sections[s.section]}</span>`;
    pill.style.left = stopX(s.section) + "px";
    el.appendChild(pill);
    const from = parseInt(new URLSearchParams(location.search).get("from") || "0", 10);
    if (from && from !== s.section) {
      tl.fromTo(pill, { x: stopX(from) - stopX(s.section) }, { x: 0, duration: 0.65, ease: MOVES.s }, 0);
    }
  };
})();
