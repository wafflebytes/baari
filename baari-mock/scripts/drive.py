# Drive a live demo night on rails with injected taps. usage: drive.py <scenario>
import json, os, sys, time, urllib.request
B = os.environ["RAILS_BASE"]; K = os.environ["ADMIN_KEY"]
def req(m, p, body=None, admin=True, t=40):
    h = {"content-type": "application/json"}
    if admin: h["x-admin-key"] = K
    r = urllib.request.Request(B + p, method=m, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r, timeout=t) as x: return json.loads(x.read() or b"{}")
    except Exception as e: return {"error": str(e)}
def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)
def handoff(): return req("GET", "/admin/handoff") or {}
def wake(): return req("GET", "/admin/wake")
def state(): return req("GET", "/app/state", admin=False, t=60)
def inject(**b):
    r = req("POST", "/admin/inject", b); log("inject", b, "->", r.get("ok"), r.get("error", ""))
    req("POST", "/admin/wake/run", {})
    return r
def wait_phase(ph, mins=10):
    end = time.time() + mins * 60
    while time.time() < end:
        h = handoff(); d = (h.get("handoff") or h)
        done = (d.get("phase_done") or "").upper()
        if done == ph: return d
        time.sleep(10)
    log("timeout waiting for", ph); return None
def outbox(since): return req("GET", f"/admin/sim-outbox?since={since}").get("items", [])
sc = sys.argv[1]
t0 = int(time.time() * 1000)
if "--stop" in sys.argv: log("stop", req("POST", "/admin/demo", {"stop": True})); time.sleep(5)
log("cast", req("POST", "/admin/cast", {"eval": True}).get("ok"))
log("demo", req("POST", "/admin/demo", {"mode": "vote" if sc == "vote" else "pick"}))
h = wait_phase("SHORTLIST", 6)
if not h: sys.exit(1)
short = [x if isinstance(x, str) else x.get("dish") for x in h.get("shortlist", [])]
tv = req("GET", "/admin/turn"); holder = tv.get("holder"); log("shortlist", short, "holder", holder)
others = [r for r in ["Vinay", "Mummy", "Papa"] if r != holder]
if sc == "veto":
    inject(role=holder, button_data=f"pick:{short[0]}"); time.sleep(25)
    inject(role=others[0], button_data="veto")
elif sc == "pick":
    inject(role=holder, button_data=f"pick:{short[1]}")
elif sc == "vote":
    inject(role="Vinay", button_data=f"vote:{short[1]}"); inject(role="Mummy", button_data=f"vote:{short[1]}"); inject(role="Papa", button_data=f"vote:{short[0]}")
h = wait_phase("LOCK", 8); log("locked", (h or {}).get("locked"))
h = wait_phase("BRIEF", 10); log("brief done", bool(h))
if sc in ("veto", "pick"):
    inject(role="Sunita", kind="voice", audio_text="haan haan didi theek hai", lang="hi-IN")
    time.sleep(120)
    inject(role="Sunita", kind="voice", audio_text="haan didi, chaar log ke liye kadhi chawal bana dungi, dahi le liya", lang="hi-IN")
    time.sleep(150)
h = handoff(); log("final handoff phase", (h.get("handoff") or h).get("phase_done"))
for it in outbox(t0): log("OUT", it.get("to") or it.get("role"), str(it.get("text") or it.get("kind") or it)[:220])
