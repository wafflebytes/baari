# The jury, and what each one will ask

Four judges, one per rail plus one on platforms. Researched 10 October 2026 from The Ken's finale page and press coverage (sources at the bottom). Ten teams present on 10 October; prize pool Rs 20 lakh; Zerodha is the title partner. The page gives no scoring rubric beyond "how AI agents will rewire India".

The pattern: three of the four judges run a rail Baari uses. Each will check whether we used their rail honestly and whether we understood it. The fourth studies why users can't leave platforms. Nobody on this jury needs AI explained.

## Vijeth Pandit, Chief Product Officer, Pine Labs and Setu

The Ken calls him "the payments rail judge". Nearly twenty years in product; before Pine Labs he led product at Razorpay (about three years, senior director), Amazon and Reliance Jio.

Why he matters most: Setu (Pine Labs owns it) launched what it called India's first agentic bill-payments product in December 2025. The agent works inside rules the user sets, can't exceed preset spending limits, and runs inside Claude and ChatGPT. That's our mandate ask, already shipping for bills. He'll recognise the idea instantly. Our job is to show we hit the same wall from the other side and have the evals to prove why the rules can't live in the prompt.

Lines aimed at him: the jingle's "Please approve our mandate", E04 in Chaitanya's section, and "A kitchen is a bill that changes every day" in Keshav's.

Questions to expect (Vinay answers all Pine Labs questions):

- **"Why not UPI Circle?"** Circle delegates spending to a person, capped per transaction. We need delegation to an agent, with a payee list, an "ask above" line and a reason on each debit. Check Circle's current limits before saying numbers; our research notes had Rs 5,000 a transaction and Rs 15,000 a month, from September.
- **"What's actually real on Pine Labs?"** Payment links are real on the sandbox: created, read back, declined. The paid step waited on a test card acquirer for our merchant (support query 112650368, 8 October). A Rs 5,000 Reserve Pay mandate exists on the sandbox but can't be approved, because UPI isn't on for our merchant, so small debits run on a demo block with the same limits. Say it in that order, plainly.
- **"Reserve Pay settles to the merchant that holds the mandate. How does the kirana get paid?"** That's invention 2, a payee-routed debit on our mock. It's part of the ask.
- **"Why didn't you use the native connector?"** It didn't connect for us, so Baari reaches Pine Labs through our rails. Say it as what we learned, not as a complaint.
- **"Who's liable when the agent pays wrong?"** The parent set the limit. Rails refuses anything outside it before Pine Labs sees it. Every debit carries a reason and a reference, and a paid reference pays exactly once.

## Vani Venkatesh, Deputy CEO, Delhivery

"The logistics rail judge". Moved up from Chief Business Officer to Deputy CEO in August 2026, now over revenue, marketing and customer experience, and working with operations. Joined Delhivery in February 2025. Before that: CEO of Airtel's global business and of Airtel Delhi-NCR, and roles at McKinsey, Unilever and Abbott Nutrition.

What she'll listen for: revenue and the customer's experience. She runs a P&L, so "what does Delhivery get" matters more than the API.

Lines aimed at her: Vinay's "Parcel late overnight? A rider from the lane kirana, then a pickup, then the runner-up dish. You hear only if dinner changes." That last sentence is a customer-experience promise, and she owns CX.

Questions to expect:

- **"Is Delhivery real here?"** It's a mock built to Delhivery's documented paths and fields, because we had no API tokens. Say it first, before she asks.
- **"What's in it for Delhivery?"** (Chaitanya) We know tomorrow's order at 9:30 the night before. Small, recurring, predictable. That's demand you can plan a route around, and it's the opposite of a ten-minute order.
- **"What's the rider hop?"** Invention 1: a rider from the lane kirana to the flat inside a window, with no-rider, slot and cancelled outcomes. Eval E07 got a real NO_RIDER_AVAILABLE back on the platform and fell back to pickup.
- **"Why would a family use Delhivery for dal?"** Honestly, fresh things go to the kirana. Delhivery carries the dry staples the kirana doesn't stock and the late-night fallback. Don't oversell the volume.

## Muralikrishnan B, academic, former President of Xiaomi India

"The pracademic platforms judge". 27 years scaling consumer tech in India: Xiaomi India (COO from 2018, President from August 2022), Myntra-Jabong and eBay. His doctoral research at ISB studies platform lock-in. Angel investor in more than ten companies.

What he'll listen for: why users stay, why a big platform can't copy this, and whether there's a business. He's the most likely to ask about money and the least likely to be impressed by the tech.

Lines aimed at him: Chaitanya's close ("Leaving means teaching a new app your whole kitchen again") and Keshav's first hundred (the cook's route is a network).

Questions to expect:

- **"Why won't Swiggy, Zepto or Blinkit build this?"** (Chaitanya) They hold transactions and earn per order. Baari holds the kitchen's state, and some nights the right answer is to order nothing and cook what's at home. An agent paid per order can't say that.
- **"Isn't memory just lock-in?"** (Chaitanya) It's a switching cost the family can see. `/yaad` on Telegram lists everything Baari remembers about you, with a remove button on each, and it asks before it believes anything about someone else. He'll like that we've thought about it.
- **"How do you make money?"** Nothing in our docs answers this. Decide tonight. My pick: a monthly household subscription, priced below what one uneaten dinner a week costs, and say plainly that we haven't tested the price. Don't take a cut of orders; it contradicts the "order nothing" answer above.
- **"How big is this?"** We haven't sized it in a way we'd defend in front of him. Say so, then say what the first hundred homes will tell us: whether someone other than Mummy keeps holding the baari after week two.
- **"What's the network effect?"** One cook works three or four homes. A cook who gets a clear brief every morning tells her next house. It's in the design (C8) and done by hand for the first hundred, not built.

## Arunabh Biyani, Chief of Staff, Gnani.ai

"The voice rail judge". Nine years applying AI in business, first at McKinsey, then startups. At Gnani he oversees the AI products for customer service.

What he'll listen for: whether we used Gnani for something only voice can do, and whether we know its limits. He sees customer-service voice all day, so the cook's "haan haan" is the moment for him: a real Indian-language reply that a yes/no classifier gets wrong.

Lines aimed at him: Vinay's "To Baari, a vague yes isn't a yes" and "Gnani transcribed it in 0.43 seconds".

Questions to expect (Vinay answers):

- **"What's your latency?"** Gnani returned the reel's transcript in 0.43 s end to end. Through our rails a voice note takes about 5 seconds, and most of that is ours: fetching the audio from Telegram and passing it through the adapter. Fine for voice notes, not for live talk.
- **"Which languages?"** The cook's brief in Hindi, Marathi, Bangla, Tamil, Kannada or Telugu. Five Gnani Hindi voices (Urmila, Jwala, Chitra, Ambuja, Nalini) to pick from, one for the family and one for the cook.
- **"What did you build on top of Gnani?"** Invention 3: reading a reply for commitment. Confirmed with counts, vague yes, refusal, item missing, unclear, with quantities in digits and a confidence. Plus an adapter that speaks ElevenLabs' shape, so AgenticOrg's native ElevenLabs connector carries Gnani.
- **"Kitchen noise?"** Not tested. Every eval voice note was clean audio. That's next.
- **"Does a voice prove who's speaking?"** No, and Baari never treats it as proof. A voice note tells you which phone sent it, not who spoke.

## Anyone

- **"Is any of this real?"** Telegram, Gnani and AgenticOrg are real. Pine Labs links are real on the sandbox. Delhivery is a mock at its documented paths. The phone call runs on a Twilio trial and stays out of the live pitch.
- **"What happens with four of us scanning the QR at once?"** Depends on what the QR opens (see `pitch/SCRIPT.md`, claims to check). The guest night runs one guest at a time with a queue. Know the answer before you walk on.

## Who answers what

| Topic | First voice | Backup |
| --- | --- | --- |
| Pine Labs, payments, mandate | Vinay | Keshav |
| Gnani, voice, rails, the agent's wiring | Vinay | Chaitanya |
| Evals, prompts, model choice | Chaitanya | Vinay |
| Delhivery | Chaitanya | Vinay |
| Research, households, the first hundred | Keshav | Chaitanya |
| Business, moat, competition | Chaitanya | Keshav |

Answer in the Q&A voice from Chaitanya's skill: "Here's how I think about it", the answer in one line, one reason, stop. "That's next" for anything not built, with no apology.

## Sources

- The Ken, finale page and jury: https://the-ken.com/case-competition-2026/
- Vani Venkatesh's move to Deputy CEO: https://india.entrepreneur.com/business-news/delhivery-elevates-vani-venkatesh-to-deputy-ceo-coo-ajith-pai-to-exit
- Vijeth Pandit at Pine Labs and Setu: https://ffnews.com/news/setu-leadership-appointments
- Setu's agentic bill payments launch: https://finance.yahoo.com/news/setu-pine-labs-launches-agentic-113029273.html
- Muralikrishnan B as Xiaomi India President: https://www.gsmarena.com/muralikrishnan_b_xiaomi_india_president-news-55068.php
- Arunabh Biyani at Gnani.ai: https://inc42.com/company/gnani-ai/people/
