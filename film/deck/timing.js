// Every timing number in the deck lives here (film/DECK_PLAN.md section 3).
// talk: seconds of talk track for the slide, so the walkthrough adds up to 8:00.
// steps: the times (seconds into the slide's own timeline) where the build stops
// and waits for a press; the timeline's end is always the last stop.
// section: which stop the "whose baari" pill sits on (0 hides it).
window.DECK_TIMING = {
  total_talk: 480,
  sections: ["", "Mummy ki baari", "Humne kya suna", "Baari ki baari", "Hamari baari", "Pine Labs ki baari", "Ghar ki baari", "Aapki baari"],
  slides: [
    { id: "s01", title: "Aaj kya banega?", talk: 25, section: 0, steps: [2.6] },
    { id: "s02", title: "Whose baari: Mummy's", talk: 20, section: 1, steps: [] },
    { id: "s03", title: "How they get by today", talk: 20, section: 1, steps: [1.0, 2.0, 3.0] },
    { id: "s04", title: "Who we are", talk: 15, section: 1, steps: [] },
    { id: "s05", title: "The kitchen lives in one head", talk: 30, section: 2, steps: [2.2] },
    { id: "s06", title: "What we'd have built", talk: 25, section: 2, steps: [1.4] },
    { id: "s07", title: "What we found that we weren't looking for", talk: 15, section: 2, steps: [] },
    { id: "s08", title: "The app, up close", talk: 40, section: 3, steps: [], video: { src: "videos/tour.mp4", s: 40 } },
    { id: "s09", title: "One night, run by the agent", talk: 50, section: 3, steps: [], video: { src: "videos/night.mp4", s: 50 } },
    { id: "s10", title: "How it's wired, and what wakes it", talk: 35, section: 3, steps: [] },
    { id: "s11", title: "Where a night breaks", talk: 30, section: 3, steps: [] },
    { id: "s12", title: "Tested on bad nights", talk: 20, section: 3, steps: [] },
    { id: "s13", title: "How two of us built it", talk: 25, section: 4, steps: [] },
    { id: "s14", title: "What it can't do yet", talk: 15, section: 3, steps: [] },
    { id: "s15", title: "The rail: Pine Labs", talk: 30, section: 5, steps: [2.4] },
    { id: "s16", title: "The ask: an agent mandate", talk: 35, section: 5, steps: [] },
    { id: "s17", title: "What a family hands over", talk: 35, section: 6, steps: [] },
    { id: "s18", title: "Aapki baari", talk: 15, section: 7, steps: [] },
  ],
};
