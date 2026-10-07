// What Baari says while it works. A kitchen at full tilt, one verb at a time,
// so the island never sits on the same word while something is happening.
// Pure flavour: the real task always shows up between them.
const V = {
  en: ["Tempering", "Simmering", "Kneading the atta", "Puffing rotis", "Counting cooker whistles", "Toasting jeera", "Sprinkling haldi", "Haggling with the sabziwala", "Checking the pantry", "Reading the rules", "Steeping chai", "Soaking the rajma", "Chopping dhaniya", "Tasting the dal", "Folding parathas"],
  hing: ["Tadka laga raha hoon", "Dal gala raha hoon", "Atta goondh raha hoon", "Roti phula raha hoon", "Cooker ki seeti gin raha hoon", "Jeera chatka raha hoon", "Haldi chhidak raha hoon", "Sabziwale se mol-bhaav", "Pantry dekh raha hoon", "Niyam padh raha hoon", "Chai ubaal raha hoon", "Rajma bhigo raha hoon", "Dhaniya kaat raha hoon", "Dal chakh raha hoon", "Parathe bel raha hoon"],
  hi: ["तड़का लगा रहा हूँ", "दाल गला रहा हूँ", "आटा गूँध रहा हूँ", "रोटी फुला रहा हूँ", "कुकर की सीटी गिन रहा हूँ", "जीरा चटका रहा हूँ", "हल्दी छिड़क रहा हूँ", "सब्ज़ीवाले से मोल-भाव", "पेंट्री देख रहा हूँ", "नियम पढ़ रहा हूँ", "चाय उबाल रहा हूँ", "राजमा भिगो रहा हूँ", "धनिया काट रहा हूँ", "दाल चख रहा हूँ", "पराठे बेल रहा हूँ"],
};
let last = -1;
export function verb(ui = "hing") {
  const list = V[ui] || V.hing;
  let i;
  do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === last);
  last = i;
  return `${list[i]}…`;
}
