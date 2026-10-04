# Dish and object renders for the app

Generated with gpt-image-2. One shared style, one line per object. Drop each file at the path given; file names match the `photo` field rails puts on `/app/state` (as .png), and `DISHES` in `app/app.js` maps them and falls back to the gradient card when a file is missing.

Output for every image: 1024 x 1024 PNG, transparent background, object centred with about 12% empty margin, no text, no logos, no hands, no people.

## Shared style (paste before every prompt)

> A single 3D-rendered object in the style of Airbnb's 2025 skeuomorphic icons: soft, slightly toy-like, tactile and warm, like a high-quality clay or vinyl miniature with real food textures. Three-quarter view from about 35 degrees above. Soft studio key light from the upper left, gentle fill, one soft contact shadow directly under the object. Matte surfaces with a light sheen on steel and on oil or ghee. Colours rich but not saturated. Transparent background. No text, no logos, no garnish clutter, no table, no cloth, no props beyond what is described.

## Dishes (`app/img/dishes/`)

All six sit on the same plate so the set reads as one family: a round steel thali, 3 cm rim, brushed finish, with small steel katoris where noted.

| File | Prompt (after the shared style) |
|---|---|
| `rajma.png` | A steel thali with a mound of long-grain white basmati rice on the left and a steel katori of dark red rajma curry on the right, beans glossy and whole, a little thick gravy on top, a few chopped coriander leaves, one thin onion ring and a lemon wedge on the rim. |
| `lauki-chana-dal.png` | A steel thali with a katori of yellow chana dal cooked with pale green bottle gourd cubes, a ghee tadka of cumin and one dry red chilli on top, two folded phulka rotis with brown spots beside it, and a small heap of rice. |
| `palak-paneer.png` | A steel thali with a katori of smooth deep green palak gravy holding six white paneer cubes, a swirl of cream on top, and three soft round rotis stacked and slightly overlapping, one torn. |
| `kadhi.png` | A steel thali with a katori of pale yellow kadhi holding four golden besan pakoras, a red chilli and curry leaf tadka floating on top, and a mound of white rice on the side. |
| `aloo-puri.png` | A steel thali with three puffed golden puris stacked and leaning, a katori of dry-ish aloo sabzi with turmeric yellow potato chunks and mustard seeds, and a small spoon of mango pickle. |
| `egg-bhurji.png` | A steel thali with a pile of soft scrambled egg bhurji flecked with onion, tomato and green chilli, two triangular folded layered parathas with ghee shine, and a few onion slices. |

## Objects for the other screens (`app/img/obj/`)

| File | Where it shows | Prompt (after the shared style) |
|---|---|---|
| `thali-empty.png` | Fallback for any dish without a render, and the "aaj kya banega" empty state | An empty round steel thali with two empty steel katoris on it, clean, slight reflections. |
| `kirana-bag.png` | Sunita's pickup card, kirana payee in Khata | A small brown paper grocery bag, top rolled open, with three red tomatoes and a bunch of coriander peeking out. |
| `parcel.png` | Delivery screen hero | A small corrugated cardboard parcel box, taped with plain red tape, a blank white shipping label on the front, a tiny bit of a rajma packet visible through a torn corner. No brand marks. |
| `pressure-cooker.png` | Sunita screen header, the cook's brief | A small aluminium Indian pressure cooker with a black handle and a whistle on the lid, a little wisp of steam. |
| `khata-book.png` | Khata screen header | A small red cloth-bound ledger book, closed, with an elastic band, and a single brass coin resting on the cover. |
| `voice-note.png` | Voice message chips (Papa, Sunita) | A rounded retro microphone in soft cream and saffron, small enough to look like a toy, with three tiny sound wave arcs beside it. |
| `ballot.png` | Voting card on Ghar | Three small rounded tokens in a steel katori, one saffron, one green, one cream, the saffron one tilted on top as if just dropped in. |

## After generating

1. Export at 1024 px, then make a 512 px copy for the app: `sips -Z 512 in.png --out app/img/dishes/rajma.png`.
2. Keep each file under 150 KB (`pngquant --quality 70-90` if needed).
3. Run `app/deploy.sh`. Never deploy `app/` any other way.
