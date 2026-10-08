// What Baari says while it works. A kitchen at full tilt, one verb at a time,
// so the island never sits on the same word while something is happening.
// Pure flavour: the real task always shows up between them.
const V = {
  en: ["Tempering", "Simmering", "Kneading the atta", "Puffing rotis", "Counting cooker whistles", "Toasting jeera", "Sprinkling haldi", "Haggling with the sabziwala", "Checking the pantry", "Reading the rules", "Steeping chai", "Soaking the rajma", "Chopping dhaniya", "Tasting the dal", "Folding parathas"],
  hing: ["Tadka laga rahi hoon", "Dal gala rahi hoon", "Atta goondh rahi hoon", "Roti phula rahi hoon", "Cooker ki seeti gin rahi hoon", "Jeera chatka rahi hoon", "Haldi chhidak rahi hoon", "Sabziwale se mol-bhaav", "Pantry dekh rahi hoon", "Niyam padh rahi hoon", "Chai ubaal rahi hoon", "Rajma bhigo rahi hoon", "Dhaniya kaat rahi hoon", "Dal chakh rahi hoon", "Parathe bel rahi hoon"],
  hi: ["तड़का लगा रही हूँ", "दाल गला रही हूँ", "आटा गूँध रही हूँ", "रोटी फुला रही हूँ", "कुकर की सीटी गिन रही हूँ", "जीरा चटका रही हूँ", "हल्दी छिड़क रही हूँ", "सब्ज़ीवाले से मोल-भाव", "पेंट्री देख रही हूँ", "नियम पढ़ रही हूँ", "चाय उबाल रही हूँ", "राजमा भिगो रही हूँ", "धनिया काट रही हूँ", "दाल चख रही हूँ", "पराठे बेल रही हूँ"],
};
let last = -1;
export function verb(ui = "hing") {
  const list = V[ui] || V.hing;
  let i;
  do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === last);
  last = i;
  return `${list[i]}…`;
}
