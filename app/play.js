// Small touch delights. None of these decide anything; they make the app
// feel like a thing you hold. Each one is a gesture a phone is good at:
// drag, pull, shake, tilt, long-press.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const touch = matchMedia("(pointer: coarse)").matches;

// A light tick. Android vibrates; iOS 18+ Safari ticks when a switch input
// is toggled, so we keep a hidden one and click its label.
let sw = null;
export function haptic(ms = 8) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} return; }
  try {
    if (!sw) {
      sw = document.createElement("label");
      sw.setAttribute("aria-hidden", "true");
      sw.style.cssText = "position:fixed;left:-200px;top:0;opacity:0;pointer-events:none";
      const i = document.createElement("input");
      i.type = "checkbox";
      i.setAttribute("switch", "");
      i.tabIndex = -1;
      sw.appendChild(i);
      document.body.appendChild(sw);
    }
    sw.click();
  } catch (e) {}
}

// Emoji burst from a point. Used for treats, a finished thali, easter eggs.
export function burst(x, y, items = ["✨"], n = 14) {
  if (reduce) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "burst";
    s.textContent = items[i % items.length];
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2;
    const d = 60 + Math.random() * 110;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 60;
    const r = (Math.random() - 0.5) * 360;
    s.animate([
      { transform: "translate(-50%,-50%) scale(0.3)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${r / 2}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 140}px)) scale(0.8) rotate(${r}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 400, easing: "cubic-bezier(0.22,1,0.36,1)" }).onfinish = () => s.remove();
  }
}

// Steam puffs over a dish when you tap it.
export function steam(el) {
  if (reduce) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 4; i++) {
    const s = document.createElement("i");
    s.className = "puff";
    s.style.left = `${r.left + r.width * (0.3 + Math.random() * 0.4)}px`;
    s.style.top = `${r.top + r.height * 0.35}px`;
    document.body.appendChild(s);
    s.animate([
      { transform: "translate(-50%,0) scale(0.4)", opacity: 0 },
      { opacity: 0.7, offset: 0.3 },
      { transform: `translate(calc(-50% + ${(Math.random() - 0.5) * 30}px), -70px) scale(1.6)`, opacity: 0 },
    ], { duration: 1300, delay: i * 140, easing: "ease-out", fill: "both" }).onfinish = () => s.remove();
  }
}

// Pull down at the top of a screen and a roti flips on a tawa. Let go past
// the line and the app refreshes. Touch only.
export function pullToRefresh(onRefresh) {
  if (!touch) return;
  const el = document.createElement("div");
  el.className = "ptr";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="ptr-tawa"><i class="ptr-roti"></i></div><span class="ptr-t"></span>`;
  document.body.appendChild(el);
  const roti = el.querySelector(".ptr-roti"), txt = el.querySelector(".ptr-t");
  let y0 = null, dy = 0, busy = false, armed = false;
  const blocked = () => document.documentElement.matches(".sheet-open, .fab-open, .ob-open, .take-open, .isl-open, .pop-open");
  addEventListener("touchstart", (e) => {
    if (busy || scrollY > 0 || blocked() || e.touches.length > 1 || e.target.closest("[data-nopull]")) return;
    y0 = e.touches[0].clientY; dy = 0; armed = false;
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (scrollY > 0) { y0 = null; return; }
    const p = Math.min(1, dy / 90);
    el.style.setProperty("--p", p.toFixed(3));
    el.classList.add("on");
    roti.style.transform = `rotateX(${p * 180}deg) scale(${0.6 + p * 0.4})`;
    txt.textContent = p >= 1 ? "Chhodo, roti palat do" : "Neeche kheecho";
    if (p >= 1 && !armed) { armed = true; haptic(10); }
    if (p < 1) armed = false;
  }, { passive: true });
  addEventListener("touchend", async () => {
    if (y0 === null) return;
    y0 = null;
    if (dy >= 90 && !busy) {
      busy = true;
      el.classList.add("go");
      txt.textContent = "Taaza kar rahe hain";
      roti.style.transform = "";
      await Promise.all([onRefresh(), new Promise((r) => setTimeout(r, 900))]);
      txt.textContent = "Garam garam";
      haptic(12);
      await new Promise((r) => setTimeout(r, 450));
      busy = false;
    }
    el.classList.remove("on", "go");
    el.style.setProperty("--p", 0);
  });
}

// Shake the phone. iOS asks for motion permission once, from a tap.
let shakeFn = null, shakeOn = false;
export async function enableShake(fn) {
  shakeFn = fn;
  if (shakeOn) return true;
  try {
    if (typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) {
      if ((await DeviceMotionEvent.requestPermission()) !== "granted") return false;
    }
  } catch (e) { return false; }
  shakeOn = true;
  let last = 0, hits = 0, t0 = 0;
  addEventListener("devicemotion", (e) => {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const f = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    const now = Date.now();
    if (f > 38) {
      if (now - t0 > 900) { hits = 0; t0 = now; }
      hits++;
      if (hits >= 3 && now - last > 1500) { last = now; hits = 0; shakeFn && shakeFn(); }
    }
  });
  return true;
}

// Tilt: the element leans with the phone (gyroscope) or the finger.
let tiltEls = new Set(), tiltOn = false;
export async function tilt(el) {
  tiltEls.add(el);
  if (tiltOn) return;
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return;
    }
  } catch (e) { return; }
  tiltOn = true;
  addEventListener("deviceorientation", (e) => {
    const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 30));
    const y = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30));
    tiltEls.forEach((t) => { if (!t.isConnected) { tiltEls.delete(t); return; } t.style.setProperty("--tx", x.toFixed(3)); t.style.setProperty("--ty", y.toFixed(3)); });
  });
}

// Drag with a spring home, or a drop target. opts.drop(el, target) returns
// true when the drop is taken; otherwise the thing springs back.
// The click that follows a drag lands on whatever replaced the dragged
// element, so callers check this instead.
let lastDrag = 0;
export const justDragged = () => Date.now() - lastDrag < 350;
export function dragger(root, sel, { targets, drop, move, start } = {}) {
  let cur = null;
  root.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(sel);
    if (!el || !root.contains(el) || e.button > 0) return;
    const r = el.getBoundingClientRect();
    cur = { el, x0: e.clientX, y0: e.clientY, r, moved: false, id: e.pointerId, over: null };
  });
  addEventListener("pointermove", (e) => {
    if (!cur || e.pointerId !== cur.id) return;
    const dx = e.clientX - cur.x0, dy = e.clientY - cur.y0;
    if (!cur.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      cur.moved = true;
      cur.el.classList.add("dragging");
      cur.el.setPointerCapture?.(e.pointerId);
      haptic(6);
      start && start(cur.el);
    }
    e.preventDefault();
    cur.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.12) rotate(${Math.max(-12, Math.min(12, dx / 8))}deg)`;
    if (targets) {
      const hit = [...root.querySelectorAll(targets)].find((t) => {
        const b = t.getBoundingClientRect();
        return e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom && t !== cur.el;
      }) || null;
      if (hit !== cur.over) { cur.over && cur.over.classList.remove("over"); hit && hit.classList.add("over"); if (hit) haptic(4); cur.over = hit; }
    }
    move && move(cur.el, e, dx, dy);
  }, { passive: false });
  const end = (e) => {
    if (!cur || (e && e.pointerId !== cur.id)) return;
    const c = cur;
    cur = null;
    if (!c.moved) return;
    lastDrag = Date.now();
    c.el.classList.remove("dragging");
    c.over && c.over.classList.remove("over");
    const took = drop ? drop(c.el, c.over, e) : false;
    if (took === "stay") return;
    c.el.classList.add("springing");
    c.el.style.transform = "";
    setTimeout(() => c.el.classList.remove("springing"), 520);
    // A drag is not a tap: swallow the click that follows.
    c.el.addEventListener("click", (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
}

// Long-press: fires once after 450 ms without moving.
export function longPress(root, sel, fn) {
  let t = null, x = 0, y = 0;
  root.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(sel);
    if (!el) return;
    x = e.clientX; y = e.clientY;
    t = setTimeout(() => { t = null; haptic(14); fn(el); }, 450);
  });
  const clear = () => { if (t) { clearTimeout(t); t = null; } };
  root.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - x, e.clientY - y) > 8) clear(); });
  root.addEventListener("pointerup", clear);
  root.addEventListener("pointercancel", clear);
}
