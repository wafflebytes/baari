import React from "react";
import { interpolate, staticFile, Img } from "remotion";
import { C, F, cut, ease, bounce, smooth } from "./kit";

/** Greyscale Telegram-style chat (bubble shapes only, no logo), in a black-card phone. */
export type Msg = { at: number; side: "in" | "out"; from?: string; text?: string; voice?: number; dishes?: boolean; buttons?: string[]; press?: number; hi?: boolean };
export const Chat: React.FC<{ f: number; title: string; sub: string; msgs: Msg[]; style?: React.CSSProperties; w?: number; h?: number }> = ({ f, title, sub, msgs, style, w = 470, h = 800 }) => {
  const shown = msgs.filter((m) => f >= m.at);
  return (
    <div style={{ position: "absolute", width: w, height: h, filter: cut(5, 18), ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "#111", borderRadius: 60 }} />
      <div style={{ position: "absolute", left: 14, top: 14, right: 14, bottom: 14, borderRadius: 48, overflow: "hidden", background: "#e9e9e7", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#fafafa", padding: "54px 22px 14px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #ddd" }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "#000", display: "grid", placeItems: "center" }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: C.haldi }} />
          </div>
          <div>
            <div style={{ fontFamily: F.tight, fontWeight: 700, fontSize: 21, color: "#111" }}>{title}</div>
            <div style={{ fontFamily: F.inter, fontSize: 15, color: "#777" }}>{sub}</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "16px 16px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
          {shown.slice(-5).map((m, i) => {
            const p = ease(f, m.at, m.at + 9, bounce);
            const out = m.side === "out";
            return (
              <div key={m.at + "-" + i} style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "84%", transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + p * 0.15})`, opacity: p, transformOrigin: out ? "100% 100%" : "0 100%" }}>
                {m.from ? <div style={{ fontFamily: F.inter, fontWeight: 600, fontSize: 14, color: "#555", margin: "0 0 4px 10px" }}>{m.from}</div> : null}
                <div style={{ background: out ? "#d9d9d6" : "#fff", borderRadius: 20, borderBottomRightRadius: out ? 6 : 20, borderBottomLeftRadius: out ? 20 : 6, padding: m.dishes ? 8 : "12px 16px", fontFamily: m.hi ? F.deva : F.inter, fontSize: 19, lineHeight: 1.35, color: "#111", boxShadow: m.hi ? `0 0 0 3px ${C.haldi}` : "0 1px 1px rgba(0,0,0,.08)" }}>
                  {m.dishes ? (
                    <div style={{ display: "flex", gap: 8, filter: "grayscale(1)" }}>
                      {["rajma", "lauki-chana-dal"].map((d) => (
                        <Img key={d} src={staticFile(`app/img/dishes/${d}.png`)} style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 14, background: "#f3f3f3" }} />
                      ))}
                    </div>
                  ) : null}
                  {m.dishes ? <div style={{ padding: "8px 8px 2px", fontSize: 18 }}>Kal kya banega? Rajma chawal ya Lauki chana dal?</div> : null}
                  {m.voice ? <Voice f={f - m.at} len={m.voice} /> : null}
                  {m.text}
                </div>
                {m.buttons ? (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {m.buttons.map((b, j) => {
                      const pr = m.press !== undefined && j === 2 && f >= m.press && f < m.press + 5 ? 0.97 : 1;
                      const on = m.press !== undefined && j === 2 && f >= m.press;
                      return (
                        <div key={b} style={{ flex: 1, textAlign: "center", background: on ? "#555" : "rgba(255,255,255,.75)", color: on ? "#fff" : "#222", borderRadius: 12, padding: "10px 4px", fontFamily: F.inter, fontWeight: 600, fontSize: 16, transform: `scale(${pr})` }}>
                          {b}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: w / 2 - 56, top: 24, width: 112, height: 30, borderRadius: 20, background: "#000" }} />
    </div>
  );
};

const BARS = [6, 12, 18, 10, 22, 28, 16, 24, 30, 20, 14, 26, 18, 10, 22, 28, 12, 18, 24, 8, 16, 22, 12, 6];
export const Voice: React.FC<{ f: number; len: number }> = ({ f, len }) => {
  const p = Math.max(0, Math.min(1, f / len));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 0" }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: "#333", display: "grid", placeItems: "center" }}>
        <div style={{ width: 0, height: 0, borderLeft: "13px solid #fff", borderTop: "8px solid transparent", borderBottom: "8px solid transparent", marginLeft: 4 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        {BARS.map((b, i) => (
          <div key={i} style={{ width: 4, height: b, borderRadius: 2, background: i / BARS.length < p ? "#222" : "#aaa" }} />
        ))}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 14, color: "#666" }}>0:0{Math.max(1, Math.round(len / 30))}</div>
    </div>
  );
};

/** The AgenticOrg agent page, rebuilt from the platform layout with Baari's real record. */
const CALLS = [
  ["knowledge_base_search", "house rules · Sharma ghar"],
  ["telegram.read_messages", "3 votes, 1 voice note"],
  ["gnani.speech_to_text", "Papa: aloo puri, pakka"],
  ["pinelabs.balance", "Rs 5,000 block"],
  ["delhivery.serviceability", "110042 ok"],
  ["delhivery.create_shipment", "waybill 2471787140482"],
  ["pinelabs.debit", "BAARI-2026-10-05-staples · SUCCESS"],
  ["telegram.send_voice", "Sunita ko brief"],
  ["pinelabs.pay_kirana", "Rs 45 · Sharma Kirana · SUCCESS"],
];
export const AgentPage: React.FC<{ f: number; style?: React.CSSProperties }> = ({ f, style }) => {
  const press = 26;
  const pr = f >= press && f < press + 5 ? 0.97 : 1;
  const running = f >= press + 4;
  const shimmerX = ((f * 3) % 300) - 100;
  return (
    <div style={{ position: "absolute", width: 1180, height: 700, filter: cut(5, 18), ...style }}>
      <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 18, overflow: "hidden", fontFamily: F.inter }}>
        <div style={{ height: 44, background: "#f1f1ef", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
          <div style={{ marginLeft: 20, background: "#fff", borderRadius: 8, padding: "5px 14px", fontSize: 15, color: "#666", fontFamily: F.mono }}>AgenticOrg · Agents · Baari</div>
        </div>
        <div style={{ padding: "26px 34px", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#000", display: "grid", placeItems: "center" }}><div style={{ width: 26, height: 26, borderRadius: 13, background: C.haldi }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.tight, fontWeight: 800, fontSize: 34 }}>Baari</div>
            <div style={{ color: "#666", fontSize: 17 }}>custom · operations · GPT-5.4 · confidence floor 0.5 · HITL if confidence &lt; 0.3</div>
          </div>
          <div style={{ background: "#111", color: "#fff", borderRadius: 999, padding: "14px 28px", fontWeight: 700, fontSize: 19, transform: `scale(${pr})` }}>Run Agent</div>
        </div>
        <div style={{ display: "flex", gap: 14, padding: "0 34px" }}>
          {[["Status", "Active"], ["Prompt", "v5 · 14,872 chars"], ["Connectors", "6 attached"], ["Evals", "8 / 10"]].map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: "#f5f5f3", borderRadius: 14, padding: "14px 18px" }}>
              <div style={{ color: "#888", fontSize: 14 }}>{k}</div>
              <div style={{ fontFamily: F.tight, fontWeight: 700, fontSize: 22, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 34px 0" }}>
          <div style={{ fontFamily: F.tight, fontWeight: 700, fontSize: 20, marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
            Run feed
            {running ? (
              <span style={{ fontWeight: 600, fontSize: 17, backgroundImage: `linear-gradient(90deg,#999 ${shimmerX}%, #111 ${shimmerX + 15}%, #999 ${shimmerX + 30}%)`, WebkitBackgroundClip: "text", color: "transparent" }}>Baari soch raha hai…</span>
            ) : null}
          </div>
          {CALLS.map(([n, d], i) => {
            const t = press + 12 + i * 9;
            const p = ease(f, t, t + 8);
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 0", borderBottom: "1px solid #eee", opacity: p, transform: `translateY(${(1 - p) * 12}px)`, filter: `blur(${(1 - p) * 3}px)` }}>
                <div style={{ width: 11, height: 11, borderRadius: 6, background: C.green }} />
                <div style={{ fontFamily: F.mono, fontSize: 17, width: 380 }}>{n}</div>
                <div style={{ color: "#555", fontSize: 17 }}>{d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export { interpolate, smooth };
