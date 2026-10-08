# Dish and object renders for the app

Version 2, for regenerating the whole set so it reads as one family: the 7 dishes rails already uses plus the 44 from the cuisine picker (`app/cuisine.js`). Generate with gpt-image-2 (or whatever gave the first set). Use the same model, settings and style block for every image, all in one sitting if you can.

File names are the dish `id`. The app looks for `app/img/dishes/<id>.webp` and falls back to an emoji on the cuisine's colour when a file is missing, so you can drop them in a few at a time.

## Output for every dish

- Generate at 1536 x 1024, transparent background.
- The vessel is centred and about 72% of the image width. Leave the same empty margin on every image so they line up in a grid.
- Export a copy at 800 x 568 (the size the hero and the deck use). See "After generating".
- No text, no logos, no hands, no people, no cutlery unless the prompt asks for it.

## Shared style (paste before every prompt)

> A single 3D-rendered dish in the style of Airbnb's 2025 skeuomorphic icons: soft, slightly toy-like, tactile and warm, like a high-quality clay or vinyl miniature with real food textures. Three-quarter view from about 35 degrees above, the same camera height and distance for every dish. Soft studio key light from the upper left, gentle fill from the right, one soft contact shadow directly under the vessel. Matte surfaces with a light sheen on steel, on oil, on ghee and on sauces. Colours rich but not oversaturated. Transparent background. No table, no cloth, no text, no logos, no clutter beyond what is described.

## Vessels (pick the one each prompt names)

Two families, so Indian home food stays on steel and everything else sits on the same stoneware. Never mix in other plates.

- **Steel thali**: round brushed steel thali, 3 cm rim, with small steel katoris where noted.
- **Steel plate**: the same steel, a flat round plate without katoris (for street food and South Indian).
- **Cream plate**: a round matte cream stoneware plate with a thin unglazed sand-coloured rim, the same diameter as the thali.
- **Cream bowl**: a deep matte cream stoneware bowl with the same sand rim, seen at the same angle.

## Already in the app (regenerate these too)

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `rajma` | Steel thali | A mound of long-grain white basmati rice on the left and a katori of dark red rajma curry on the right, beans glossy and whole, thick gravy, a few chopped coriander leaves, one thin onion ring and a lemon wedge on the rim. |
| `lauki-chana-dal` | Steel thali | A katori of yellow chana dal with pale green bottle gourd cubes, a ghee tadka of cumin and one dry red chilli on top, two folded phulkas with brown spots, and a small heap of rice. |
| `palak-paneer` | Steel thali | A katori of smooth deep green palak gravy holding six white paneer cubes, a swirl of cream, and three soft round rotis stacked and slightly overlapping, one torn. |
| `kadhi` | Steel thali | A katori of pale yellow kadhi with four golden besan pakoras, a red chilli and curry leaf tadka floating on top, and a mound of white rice. |
| `aloo-puri` | Steel thali | Three puffed golden puris stacked and leaning, a katori of dry-ish aloo sabzi with turmeric potato chunks and mustard seeds, and a small spoon of mango pickle. |
| `egg-bhurji` | Steel thali | A pile of soft egg bhurji flecked with onion, tomato and green chilli, two triangular folded parathas with a ghee shine, and a few onion slices. |
| `chole-chawal` | Steel thali | A katori of dark brown Punjabi chole, chickpeas whole and glossy, ginger slivers and a green chilli on top, a mound of white rice, sliced onion rings and a lemon wedge. |

## Ghar ka khana

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `chole-bhature` | Steel thali | Two huge puffed golden bhature, one leaning on the other, a katori of dark chole with a green chilli on top, sliced onion with a lemon wedge, and a little green chutney. |
| `aloo-paratha` | Steel thali | Two thick golden aloo parathas, one folded into a triangle showing the spiced potato inside, a cube of white butter melting on top, a katori of curd and a spoon of mango pickle. |
| `dal-makhani` | Steel thali | A katori of glossy dark dal makhani with a swirl of cream and a little butter, a mound of jeera rice with visible cumin seeds, and a few onion rings. |
| `paneer-butter-masala` | Steel thali | A katori of orange-red paneer butter masala with soft paneer cubes and a cream swirl, two butter naans with charred spots, folded, and a lemon wedge. |

## South Indian

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `masala-dosa` | Steel plate | One long crisp golden masala dosa rolled into a cone that overhangs the plate, a bit of yellow potato filling visible, with two small katoris of coconut chutney and sambar beside it. |
| `idli-sambar` | Steel plate | Three soft white idlis in a row, a katori of orange sambar with drumstick and a curry leaf, a katori of white coconut chutney with a mustard tadka. |
| `curd-rice` | Cream bowl | White curd rice with a mustard seed, curry leaf and red chilli tadka on top, a few pomegranate seeds and grated carrot, a spoon of lime pickle on the rim. |
| `lemon-rice` | Steel plate | Bright yellow lemon rice with roasted peanuts, curry leaves and a dry red chilli, a lemon half on the side, a small papad leaning on the rice. |

## Street food

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `pav-bhaji` | Steel plate | A mound of red-orange bhaji with a cube of melting butter and chopped onion and coriander, two buttered toasted pav side by side, and a lemon wedge. |
| `vada-pav` | Steel plate | Two vada pav, each a soft pav with a golden batata vada inside, a fried green chilli on top, with a little dry garlic chutney beside them. |
| `dahi-puri` | Steel plate | Six crisp puri shells in a circle, each filled with potato, white curd, sweet tamarind and green chutney, sev and pomegranate seeds sprinkled on top. |
| `misal-pav` | Steel thali | A katori of fiery red misal with a layer of crunchy yellow farsan on top, chopped onion and coriander, two pav and a lemon wedge beside it. |

## Indo-Chinese

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `hakka-noodles` | Cream bowl | A tall twirl of veg hakka noodles with julienned cabbage, carrot, capsicum and spring onion, glossy with soy, a pair of plain wooden chopsticks resting on the rim. |
| `chilli-paneer` | Cream plate | Dry chilli paneer: crisp paneer cubes tossed with diced capsicum and onion petals in a glossy dark red sauce, spring onion greens on top. |
| `manchurian-fried-rice` | Cream plate | A dome of veg fried rice on one side and four veg manchurian balls in dark glossy gravy on the other, spring onion greens over both. |
| `schezwan-noodles` | Cream bowl | Red-orange schezwan noodles with vegetables and visible chilli flakes, spring onion greens, chopsticks resting on the rim. |

## Momos and thukpa

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `veg-momos` | Cream plate | Eight steamed white veg momos with pleated tops in a ring, a small bowl of bright red momo chutney in the middle. |
| `paneer-momos` | Cream plate | Six pan-fried paneer momos, golden on the bottom, one cut open to show the paneer filling, with a small bowl of red chutney. |
| `thukpa` | Cream bowl | Steaming veg thukpa: noodles in a clear golden broth with bok choy, carrot coins, mushrooms and spring onion, a thin wisp of steam. |

## Italian

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `arrabbiata` | Cream bowl | Penne in a bright red arrabbiata sauce with chilli flakes, a few torn basil leaves and a light snow of grated parmesan. |
| `white-sauce-pasta` | Cream bowl | Penne in a creamy white sauce with sweet corn, broccoli florets and red capsicum, black pepper and oregano on top. |
| `tawa-pizza` | Cream plate | A small round thin-crust pizza cooked on a tawa, cut into six slices, one slice pulled slightly out with a mozzarella stretch, toppings of capsicum, onion, tomato and olives. |
| `mac-cheese` | Cream bowl | Macaroni in a thick golden cheddar sauce with a baked crust on top, a few spots of browned cheese and a pinch of chilli flakes. |

## Mexican

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `burrito-bowl` | Cream bowl | A burrito bowl in neat sections: rice, red rajma, sweet corn, pico de gallo, sliced avocado, shredded lettuce and a spoon of sour cream, a lime wedge on top. |
| `quesadilla` | Cream plate | A golden grilled tortilla quesadilla cut into four triangles, paneer, peppers and melted cheese showing at the cut, a small bowl of salsa. |
| `nachos` | Cream plate | A heap of corn nachos covered in melted cheese, beans, jalapeño rings, salsa and a spoon of sour cream. |
| `tacos` | Cream plate | Three crisp corn taco shells standing in a row, filled with spiced beans, lettuce, tomato salsa and a drizzle of white sauce. |

## Korean

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `kimchi-fried-rice` | Cream bowl | Red-tinted kimchi fried rice topped with a sunny side up egg, spring onion, toasted sesame seeds and a strip of nori. |
| `korean-ramen` | Cream bowl | Spicy red Korean ramen with curly noodles, a soft-boiled egg halved to show a jammy yolk, spring onion and sesame, a thin wisp of steam, chopsticks resting on the rim. |
| `bibimbap` | Cream bowl | Bibimbap: white rice under neat sections of spinach, carrot, bean sprouts, mushroom and cucumber, a fried egg in the centre and a spoon of red gochujang. |
| `gochujang-paneer` | Cream bowl | Glossy red gochujang-glazed paneer cubes over white rice, sesame seeds, spring onion and a few cucumber slices. |

## Thai

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `green-curry` | Cream bowl | Thai green curry with vegetables and tofu in a pale green coconut sauce, Thai basil and a red chilli slice on top, a small mound of jasmine rice on the side of the bowl. |
| `pad-thai` | Cream plate | Veg pad thai with flat rice noodles, tofu, bean sprouts and egg, crushed peanuts and a lime wedge on top, spring onion. |
| `basil-fried-rice` | Cream plate | Thai basil fried rice with glossy holy basil leaves, red chilli, French beans, a fried egg on the side. |

## Middle Eastern

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `falafel-wrap` | Cream plate | A falafel wrap cut in half on a diagonal, showing green falafel, lettuce, tomato, pickled onion and white tahini sauce, a small bowl of extra sauce beside it. |
| `hummus-pita` | Cream plate | A swirl of smooth hummus with olive oil pooled in the centre, paprika and chickpeas on top, warm pita triangles fanned beside it. |
| `paneer-shawarma` | Cream plate | A rolled paneer shawarma in pita, wrapped halfway in plain parchment, charred paneer strips, onion and garlic sauce showing, with a few pickled cucumbers. |

## Bowls and salads

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `buddha-bowl` | Cream bowl | A buddha bowl with roasted spiced chickpeas, quinoa, cucumber, cherry tomatoes, avocado slices, purple cabbage and a drizzle of tahini. |
| `quinoa-salad` | Cream bowl | A bright quinoa salad with cucumber, cherry tomatoes, corn, red onion, mint and a lemon wedge. |
| `sprouts-bowl` | Cream bowl | Masala moong sprouts with onion, tomato, coriander, a squeeze of lemon and a sprinkle of chaat masala. |

## Cafe at home

| File | Vessel | Prompt (after the shared style) |
|---|---|---|
| `bombay-sandwich` | Cream plate | A Bombay sandwich cut into four triangles, layers of green chutney, potato, cucumber, tomato and beetroot showing, a little sev and ketchup on the side. |
| `aloo-tikki-burger` | Cream plate | An aloo tikki burger in a soft sesame bun, golden tikki, lettuce, tomato, onion and a drip of mayo, with a few fries leaning beside it. |
| `grilled-cheese` | Cream plate | A golden grilled cheese sandwich cut on a diagonal, melted cheese stretching between the halves. |
| `masala-omelette` | Cream plate | A folded masala omelette flecked with onion, tomato, green chilli and coriander, with two slices of buttered toast. |

## Objects for the other screens (`app/img/obj/`)

Same style block, same light. These stay as in version 1.

| File | Where it shows | Prompt (after the shared style) |
|---|---|---|
| `thali-empty.png` | Fallback for any dish without a render | An empty round steel thali with two empty steel katoris on it, clean, slight reflections. |
| `kirana-bag.png` | Sunita's pickup card, kirana payee in Khata | A small brown paper grocery bag, top rolled open, with three red tomatoes and a bunch of coriander peeking out. |
| `parcel.png` | Delivery screen hero | A small corrugated cardboard parcel box, taped with plain red tape, a blank white label on the front. No brand marks. |
| `pressure-cooker.png` | Sunita screen header | A small aluminium Indian pressure cooker with a black handle and a whistle on the lid, a little wisp of steam. |
| `khata-book.png` | Khata screen header | A small red cloth-bound ledger book, closed, with an elastic band, and a single brass coin on the cover. |
| `voice-note.png` | Voice message chips | A rounded retro microphone in soft cream and saffron, toy-like, with three tiny sound wave arcs beside it. |
| `ballot.png` | Voting card on Ghar | Three small rounded tokens in a steel katori, one saffron, one green, one cream, the saffron one tilted on top as if just dropped in. |

## After generating

1. Trim and size to the app's frame: `sips -z 568 800 in.png --out app/img/dishes/<id>.png`. If the model drifts off centre, crop first so the vessel keeps the same margin as the others.
2. Make the webp the app loads first: `cwebp -q 82 -alpha_q 90 app/img/dishes/<id>.png -o app/img/dishes/<id>.webp`.
3. Keep each file under 150 KB (`pngquant --quality 70-90` on the png if needed).
4. Run `app/deploy.sh`. Never deploy `app/` any other way.
