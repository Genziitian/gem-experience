#!/usr/bin/env node
/* The House's information pages and the size guide, written from one file.
 *
 *   node tools/build-house-pages.mjs
 *
 * Every statement on these pages comes from the house's own material already
 * on the site (The House, the World of Preciousness guides, the High Jewellery
 * write-ups, the product care text) or from the client's corrections list.
 * Where the house has not yet supplied something (investor reports, founding
 * dates, the Maasai Women Project write-up) the
 * page says only what is known and leaves the rest out; nothing is invented.
 * Adding a section is adding an entry below and re-running this. Run
 * build:seo afterwards for the head tags and the sitemap.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "frontend");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// plain text with [label](href) links
const rich = (s) => esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="pg-link" href="$2">$1</a>');

const HOURS = [
  ["3,700+", "hours", "Flamenco"], ["3,000+", "hours", "Ember"], ["2,600", "hours", "Samaah"],
  ["2,300", "hours", "Shamsa"], ["2,100", "hours", "Celestine"], ["1,900", "hours", "Rihla"],
];

/* GE Icons, from the house's sheet "GE Icons for website.xlsx": title, type,
   the description used earlier and the photographs it links to (model and
   product shots, downloaded to icons/img/<slug>-1/-2). The facts line only
   repeats what the description states; ref and spec come from the pieces'
   own sheet where there is one ("URNS & VASE - Sheet1.pdf"). Tangerine and
   Scarlet have model photographs only. */
const ICONS = [
  { slug: "tangerine", title: "Tangerine", kind: "Set: necklace and earrings", facts: "122.6 ct morganite", model: [1, 2],
    p: ["Tangerine, is an iconic jewellery set that has graced the lobes and necks of queens and princesses throughout the ages. Crafted from the finest morganite stone, this set consists of earrings and a pendant with an impressive total weight of 122.6 carats.",
        "The subtle shade of orange that permeates the morganite stones exudes an opulence that has long been associated with royalty and nobility. The delicate hues of Tangerine perfectly complemented the opulent gowns of these regal women, accentuating their natural beauty and elegance."] },
  { slug: "scarlet", title: "Scarlet", kind: "Earrings", facts: "54.5 ct Malaya garnet", model: [1, 2],
    p: ["Let the ‘Scarlet’ set transport you to a bygone era of opulence and extravagance. Fit for royalty, this magnificent set features a total of 54.5-carat Malaya Garnet stones that will leave you spellbound.",
        "The pink-orange hue of the Malaya Garnet stones is reminiscent of the sun-kissed skies of a summer's day, adding an ethereal touch of beauty and grace to the Scarlet set. The attention to detail and exquisite craftsmanship that has gone into the creation of this set is truly remarkable, a testament to the skilled artisans who have brought this masterpiece to life."] },
  { slug: "urns-vase-i", title: "Urns and Vase Collection", kind: "Earrings", facts: "22.820 ct tanzanite · 2.366 ct diamonds", model: [2],
    ref: "SG-01", spec: "18k gold · 2 fancy-cut tanzanites · net 9.473 g · gross 14.51 g",
    p: ["The Urns and Vase collection is a true celebration of the art of floral arrangement. With influences from diverse cultures, this collection boasts an awe-inspiring range of vases that showcase slender flowers arranged in two dimensions, as well as extravagant bouquets that pay homage to European florilegia from centuries past. Infusing signature style with organic foliage shapes as basic geometry, the designer has created a modern and clean graphical setting that elevates the classic beauty of these compositions.",
        "Dripping with grandeur, these drop-dangle earrings are a masterpiece. Adorned with a stunning combination of 22.820 carats of enchanting Tanzanite precious stone and 2.366 carats of dazzling diamonds, these earrings are crafted in the brand's signature style, showcasing a modern and sleek graphical aesthetic."] },
  { slug: "urns-vase-ii", title: "Urns and Vase Collection", kind: "Earrings", facts: "25.050 ct tanzanite · 2.268 ct diamonds", model: [2],
    ref: "SG-02", spec: "18k gold · 2 fancy-cut tanzanites · net 13.536 g · gross 19.00 g",
    p: ["The visionary artist Shantanu Garg, with the assistance of Saloni Meratwal, has crafted each piece in this collection with a timeless elegance and unforgettable charm that is guaranteed to leave a lasting impression.",
        "Experience pure luxury with these earrings that are the epitome of elegance. Featuring a lavish combination of 25.050 carats of Mesmerising Tanzanite precious stone and 2.268 carats of scintillating diamonds, meticulously crafted in the brand's signature style."] },
  { slug: "bleu-bow", title: "Bleu Bow Ring", kind: "Ring", facts: "18k gold · round tanzanite · diamonds",
    p: ["A magnificent embodiment of sophistication and allure, behold the resplendent Bleu Bow Ring, crafted from 18k gold and crowned with a dazzling round-shaped tanzanite at its centre, while the exquisite bow sparkles with a captivating array of mixed-shaped diamonds."] },
  { slug: "le-fleur", title: "Le Fleur Ring", kind: "Ring", facts: "18k gold · octagon tanzanite · diamonds",
    p: ["Behold the majesty of the Le Fleur Ring - an 18k gold masterpiece that exudes timeless elegance and is a symbol of luxurious taste and grace. Its octagon-shaped Tanzanite stone, placed at the center, captures the eye with its stunning violet hues, while the intricate leaf-shaped design, adorned with a mix of diamonds of varying shapes, adds a touch of natural splendor."] },
  { slug: "jardin-de-tulips", title: "Jardin De Tulips", kind: "Bracelet", facts: "18k white gold · 6.19 ct rhodolite · diamonds",
    p: ["The Jardin de tulips bracelet features a seamless fusion of modern sophistication and timeless design. The links of 18K white gold form a delicate yet sturdy foundation, creating a luxurious and comfortable fit on the wrist. The addition of meticulously placed diamonds adds a touch of opulence and brilliance, illuminating the piece with captivating sparkle. At the heart of the bracelet lies the mesmerizing 6.19 carats rhodolite, its deep pinkish-red hue symbolizing passion and strength."] },
  { slug: "festoon", title: "Festoon Bracelet", kind: "Bracelet", facts: "9.24 ct rhodolite · diamonds",
    p: ["Festoon bracelet is a true statement piece, perfect for those seeking a touch of luxury and uniqueness. Indulge in the beauty of ancient architecture while embracing the allure of fine jewellery. Elevate your style and make a lasting impression with this exceptional piece that embodies the essence of luxury, craftsmanship, and the captivating charm of 9.24 carats rhodolite. The addition of meticulously placed diamonds adds a touch of opulence and brilliance, illuminating the piece with captivating sparkle."] },
  { slug: "pink-monarch", title: "The Pink Monarch", kind: "Bracelet", facts: "18k gold · 18.26 ct pink spinel · diamonds",
    p: ["The Pink Monarch bracelet boasts a timeless design that effortlessly captures attention. Its 18K gold links form an elegant and sturdy foundation, while the strategically placed diamonds add a touch of opulence and brilliance, captivating the eye with their scintillating sparkle.",
        "At the heart of this extraordinary bracelet lies the stunning 18.26 carats pink spinel. Each spinel is carefully selected for its exceptional color, radiating a captivating pink hue that exudes femininity and sophistication. Pink spinels are expertly set, allowing them to shine with their inherent beauty and natural allure."] },
  { slug: "blue-belle-diva", title: "Blue Belle Diva Ring", kind: "Ring", facts: "1.63 ct tanzanite",
    p: ["Blue Belle Diva Ring, a true masterpiece that combines the allure of Tanzanite with a unique and distinctive wedge shape. This exquisite ring showcases a stunning Tanzanite gemstone weighing 1.63 carats, meticulously cut and polished to enhance its natural beauty.",
        "What sets this ring apart is its remarkable wedge shape, which adds a touch of modernity and uniqueness to the design. The tapering silhouette creates a captivating visual effect and makes a bold statement on the finger."] },
];

const PAGES = {
  icons: {
    title: "GE Icons", kicker: "The House",
    description: "GE Icons: statement pieces from Gem Experience outside the Fine and High Jewellery collections, from the Tangerine morganite set to the Pink Monarch spinel bracelet.",
    lede: "Statement pieces that sit outside the Fine and High Jewellery collections: sets, earrings, rings and bracelets made to be noticed.",
    blocks: [
      { type: "icons" },
      { type: "cta", h: "See an Icon in person", p: "Every piece is shown in private, at our ateliers or by appointment.",
        actions: [["Book a private viewing", "/appointment/"], ["Request a quotation", "/quotation/", true]] },
    ],
  },

  craftsmanship: {
    title: "Craftsmanship", kicker: "The House",
    description: "How Gem Experience crafts its jewellery: precious stones sourced and mined with care, pieces made by hand in our atelier, polished and finished to perfection.",
    lede: "Every piece is crafted by hand at our atelier, then polished and finished to perfection.",
    // copy: the house's text, "website changes 1.1" (Nov 2026)
    blocks: [
      { type: "hero", img: "/craftsmanship/img/hero", alt: "A Gem Experience necklace on a dark bust." },
      { type: "split", img: "/craftsmanship/img/setting.webp", alt: "An artisan's hands setting a stone at the bench.",
        h: "From the earth", p: [
          "The experience of crafting precious stones is a true art that requires skill, patience and attention to detail. It demands specialised knowledge and expertise in fields such as geology, mineralogy and mining techniques, to locate, extract and process precious stones successfully.",
          "Gem Experience meticulously sources and mines the finest precious stones, maintaining ethical mining practices and guaranteeing exceptional quality.",
        ] },
      { type: "split", flip: true, img: "/craftsmanship/img/finishing.webp", alt: "An artisan polishing a piece by hand.",
        h: "Savoir-faire", p: [
          "Gem Experience jewellery making is a showcase of savoir-faire. At our atelier, teams of expert artisans craft every piece using the finest quality precious stones, employing various techniques to ensure superior craftsmanship.",
          "After being crafted by hand, each piece is expertly polished and finished to perfection, ensuring the highest quality and beauty.",
        ] },
      { type: "text", h: "Design", p: [
        "Our designs are created by skilled artisans who work closely with the design team to bring their vision to life. They draw inspiration from a variety of sources, including art, architecture and nature. Each piece is crafted with precision and attention to detail, using traditional and modern techniques, so that it is not only beautiful but also timeless and innovative.",
      ] },
      { type: "figures", h: "Counted in hours", p: "High Jewellery is measured at the bench.", items: HOURS },
      { type: "split", img: "/craftsmanship/img/stamp.webp", alt: "The Gem Experience stamp of authenticity.",
        h: "Quality", p: [
          "Quality is at the heart of everything we do. From sourcing the finest materials to the final finishing touches, we maintain the highest standards to ensure that every piece meets our exacting requirements.",
          "We believe that true luxury lies in the flawless execution of every element.",
        ] },
      { type: "cta", h: "See the work up close", p: "Book a private viewing and an adviser will take you through the pieces and how they were made.",
        actions: [["Book a private viewing", "/appointment/"], ["Explore High Jewellery", "/high-jewellery/", true]] },
    ],
  },

  sustainability: {
    title: "Sustainability", kicker: "The House",
    description: "Gem Experience's commitment to sustainability: ethical sourcing, people and the environment, eco-friendly production and community engagement.",
    lede: "Preserving our planet for future generations, through every aspect of our business.",
    // copy: the house's text, "website changes 1.1" (Nov 2026)
    blocks: [
      { type: "hero", img: "/sustainability/img/hero", alt: "A cut diamond lit against black." },
      { type: "text", h: "Our commitment", p: [
        "At Gem Experience, we are deeply committed to sustainability and environmental responsibility. We recognise the importance of preserving our planet for future generations, and we strive to make a positive impact through every aspect of our business.",
      ] },
      { type: "pillars", items: [
        ["/sustainability/img/sourcing", "Ethical sourcing", "We believe in transparency and accountability throughout our supply chain. That's why we carefully vet our suppliers to ensure they adhere to strict ethical and environmental standards. From responsibly sourced gemstones to conflict-free metals, we prioritise ethical sourcing practices every step of the way."],
        ["/sustainability/img/people", "People & environment", "Gem Experience is committed to living in harmony with the land and leaving a legacy for a brighter tomorrow. We consider the long-term impact of our operations and invest in sustainable practices and technologies."],
        ["/sustainability/img/production", "Eco-friendly production", "Minimising our environmental footprint is a top priority. We've implemented eco-friendly production processes and use renewable energy whenever possible. Our manufacturing facilities are equipped with state-of-the-art technologies designed to reduce waste and conserve resources."],
        ["/sustainability/img/community", "Community engagement", "We believe in giving back to the communities that support us. Through various philanthropic initiatives and partnerships, we're able to make a positive impact on the lives of others. Whether it's supporting local artisans or investing in environmental conservation projects, we're committed to creating lasting change."],
      ] },
      { type: "cta", h: "Ask us about a stone", p: "An adviser can tell you where any stone in our collections comes from.",
        actions: [["Contact us", "/contact/"], ["The World of Preciousness", "/world-of-preciousness/", true]] },
    ],
  },

  mining: {
    title: "Mining", kicker: "The House",
    description: "Where Gem Experience's stones come from: tanzanite from its single source at the foot of Kilimanjaro, and the spinel, tsavorite, rhodolite and Malaya garnet of the East African belt.",
    lede: "Every stone begins in Tanzania, and we choose it there.",
    blocks: [
      { type: "hero", img: "/mining/img/canyon", alt: "A mining gorge in Tanzania, crossed by a bridge." },
      { type: "split", img: "/mining/img/aerial.webp", alt: "The mine seen from above, among green hills.",
        h: "One place on earth", p: [
          "There is only one source of high-quality tanzanite in the world: a few square kilometres at the foot of Kilimanjaro, in northern Tanzania. As there is only one source, experts estimate that its supply may run out within a few decades.",
          "Our stones are chosen there, where they come out of the ground, rather than bought further down the line.",
        ] },
      { type: "text", h: "The East African belt", p: [
        "Around tanzanite lies the belt that also gives us [spinel](/world-of-preciousness/spinel/), from Mahenge; [tsavorite](/world-of-preciousness/tsavorite/), four times rarer than emerald; [rhodolite](/world-of-preciousness/rhodolite/); and [Malaya garnet](/world-of-preciousness/malaya-garnet/), from the Umba River Valley.",
      ] },
      { type: "split", flip: true, img: "/mining/img/plant.webp", alt: "The processing plant at the mine.",
        h: "From rough to the bench", p: [
          "Rough is sorted and graded by hand, then chosen stone by stone for the pieces it will become, before it is cut in our own workshop.",
        ] },
      { type: "gallery", h: "At the mine", items: [
        ["/mining/img/shaft", "A shaft cut into the rock."], ["/mining/img/gorge", "The gorge from above."], ["/mining/img/hills", "The workings among the hills."],
        ["/mining/img/camp", "The camp from the air."], ["/mining/img/site", "The site and its buildings."], ["/mining/img/office", "The mine office."],
      ] },
      { type: "cta", h: "Read about each stone", p: "The World of Preciousness tells the story of every stone we work with.",
        actions: [["The World of Preciousness", "/world-of-preciousness/"], ["Tanzanite", "/world-of-preciousness/tanzanite/", true]] },
    ],
  },

  "maasai-women": {
    title: "Maasai Women Project", kicker: "The House",
    description: "The Maasai Women Project: Gem Experience works with Maasai women artisans from rural Arusha on their traditional jewellery, with income, healthcare and education for their community.",
    lede: "Working with Maasai women artisans from rural Arusha, the land our stones come from.",
    // copy: the house's text, "website changes 1.1" (Nov 2026)
    blocks: [
      { type: "split", img: "/maasai-women/img/portrait.webp", alt: "A Maasai woman in a blue shuka.",
        h: "The project", p: [
          "Our brand has integrated the remarkable jewellery created by inspiring Maasai women from rural Arusha into our vision. We are committed to promoting their traditional craft by providing them with a platform to make beautiful jewellery, while also creating exquisite pieces.",
          "The Maasai women have unique skills and knowledge of traditional jewellery making that are vital to the preservation of their cultural identity. By working with them and promoting their talents, we aim to create a sustainable and meaningful impact in their lives and the local community. The profits generated from selling their jewellery will be reinvested in the Maasai women, making them self-sufficient and independent of non-sustainable revenue streams.",
        ] },
      { type: "split", flip: true, img: "/maasai-women/img/elder.webp", alt: "A Maasai elder at the door of her home.",
        h: "Craft and independence", p: [
          "Our project works closely with Maasai women artisans to develop high-quality handmade crafts, including traditional beadwork, jewellery and textiles. By leveraging their unique skills and cultural heritage, we enable these women to generate income and achieve financial independence for themselves and their families.",
          "We also prioritise healthcare access for Maasai women and their families. Through partnerships with local healthcare providers and community organisations, we offer medical clinics, vaccination programmes and maternal health services, ensuring that women receive the care they need to lead healthy and fulfilling lives.",
        ] },
      { type: "gallery", h: "The women and their work", items: [
        ["/maasai-women/img/m2", "Making jewellery outside the boma."], ["/maasai-women/img/m12", "Wire and beads, worked by hand."], ["/maasai-women/img/m6", "Showing a finished piece."],
        ["/maasai-women/img/m11", "Threading at the bench."], ["/maasai-women/img/m16", "A smile at the door."], ["/maasai-women/img/m7", "Holding up a new necklace."],
        ["/maasai-women/img/m13", "Bending wire into shape."], ["/maasai-women/img/m8", "A bracelet held to the light."], ["/maasai-women/img/m4", "Tools and wire on the table."],
        ["/maasai-women/img/m5", "Working together."], ["/maasai-women/img/m17", "Pieces held in the hands."], ["/maasai-women/img/m21", "The next generation."],
      ] },
      { type: "text", h: "A brighter future", p: [
        "By supporting the Maasai Women Project, we are not only investing in the economic empowerment of Maasai women but also contributing to the preservation of Maasai culture and traditions. Together, we can create positive change and build a brighter future for generations to come.",
      ] },
      { type: "text", h: "Community work", p: [
        "Gem Experience profoundly cares about the community and actively works to serve it. We have partnered with a local school to support its mission of providing quality education to underprivileged children, donating resources and volunteering our time to empower and uplift the students. We are sincerely committed to creating a positive impact and making a difference in people's lives.",
      ] },
      { type: "text", h: "The Maasai and tanzanite", p: [
        "The Maasai tell of a lightning bolt that struck the earth and lit the rocks a brilliant blue. That, they say, is how tanzanite was made. As a cherished heirloom it holds deep significance to the Maasai, who give it to women during childbirth.",
      ] },
      { type: "cta", h: "Hear more about the project", p: "Write to us to learn about the project and how to take part.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"], ["Contact us", "/contact/", true]] },
    ],
  },

  investors: {
    title: "Investors", kicker: "The House",
    description: "Investor information for Gem Experience: annual return reports and other investor-related documents.",
    lede: "Annual return reports and other investor information.",
    blocks: [
      // Form MGT-7A, as filed; the PDFs are the house's own (investors/reports/)
      { type: "files", h: "Annual returns", p: "Abridged annual returns (Form MGT-7A) under section 92 of the Companies Act, 2013.",
        items: [
          ["Annual Return 2024–25", "/investors/reports/annual-return-2024-25.pdf", "PDF · 18 pages"],
          ["Annual Return 2023–24", "/investors/reports/annual-return-2023-24.pdf", "PDF · 15 pages"],
        ] },
      { type: "cta", h: "Investor enquiries", p: "For investor-related questions, write to us and the right person will reply.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"]] },
    ],
  },

  timeline: {
    title: "Timeline", kicker: "The House",
    description: "The journey of Gem Experience: from Color Clarity Ltd. and the first tanzanite in 1998 to the launch of Gem Experience in 2022.",
    lede: "From Color Clarity Ltd. in 1998 to Gem Experience today.",
    // copy: the house's timeline, "website changes 1.1" (Nov 2026)
    blocks: [
      { type: "timeline", items: [
        ["1998", "Color Clarity Ltd. is born", "Color Clarity Ltd. was born from the earth below, with a passion to bring the riches of the earth to the world. The miners begin digging deep into the earth's core to find a gem of rare beauty, tanzanite. The process includes the identification of a deposit, the extraction of the rough stone, and manufacturing. With every piece, a story untold; the birth of this brand will forever hold."],
        ["2007", "Tsavorite and spinel", "Our mining operations led to an exciting discovery: we had the privilege to discover two extraordinary precious stones in Tanzania. Tsavorite, a vibrant green gemstone, and spinel, a lesser-known gemstone with a range of impressive colours, were unearthed."],
        ["2010", "Jewellery for a royal family", "The creation of the first jewellery for an African royal family marks a remarkable moment in the history of Color Clarity Ltd. It used the rosy hue of pink tanzanite, a precious stone not only stunning to behold but also incredibly rare, making it a prized possession and coveted treasure, and a reminder of the rich cultural heritage of African royalty."],
        ["2015", "The Tanzanite Experience", "The beginning of an exciting year, with the launch of a new brand, The Tanzanite Experience: bringing beauty and style, a symbol of innovation, and a sparkle into the air. A journey begins with promise and care."],
        ["2018", "Dubai", "In Dubai's bustling city, the hum of our business intensifies and the latest operation gets underway, with promise and purpose, shining so bright. A journey begins, with hope and delight, bringing innovation to a world so bright. A new chapter unfolds, in the land of light."],
        ["2019", "A new store opens", "A new store opens, with a glistening shine, a milestone reached for this brand divine. Ten doors now stand, for all to see, a symbol of growth, for you and me. The future shines bright for our brand, so fine."],
        ["2022", "Gem Experience", "A new brand, Gem Experience, begins with hope and dreams, bringing fresh ideas with vibrant gleams. A journey unfolds, with passion and fire, inspiring all with its unique desire. A future awaits; our brand is so new, shining bright, like the morning dew."],
      ] },
      { type: "cta", h: "Visit the house", p: "See the pieces, and the stones they began as, in person.",
        actions: [["Our ateliers", "/offices/"], ["Book a private viewing", "/appointment/", true]] },
    ],
  },

  careers: {
    title: "Careers", kicker: "The House",
    description: "Careers at Gem Experience: cutting, setting, design and client care at a coloured-gemstone jewellery house with ateliers in Arusha, Dubai and Jaipur.",
    lede: "We are always glad to hear from people who want to work with coloured stones.",
    blocks: [
      { type: "split", img: "/world-of-preciousness/img/sorting.webp", alt: "A gem sorter grading parcels of coloured stones at a light table.",
        h: "Work with us", p: [
          "From sorting and cutting stones to setting, design and looking after our clients, the house's work runs from Tanzania to our ateliers in Arusha, Dubai and Jaipur.",
          "Send your CV and a few lines about the work you do, and where you would like to work, to [contact@gem-experience.com](mailto:contact@gem-experience.com).",
        ] },
      { type: "cta", h: "Apply", p: "Write to us with your CV.",
        actions: [["contact@gem-experience.com", "mailto:contact@gem-experience.com"]] },
    ],
  },

  "size-guide": {
    title: "Size guide", kicker: "Client care",
    description: "Find your ring and bracelet size: how to measure at home, ring size conversions (UK, US, EU, India) and bangle sizes, from Gem Experience.",
    lede: "How to find your ring and bracelet size at home. If you are between sizes, an adviser will help you choose.",
    blocks: [
      // the house's printable sizers (A4); print at 100%, no scaling
      { type: "files", h: "Printable sizers", p: "Print at 100% on A4 with no scaling, then check the print size before measuring: the ring sizer has a 1 cm line, the bracelet sizer a credit-card outline.",
        items: [
          ["Ring sizer", "/size-guide/gem-experience-ring-sizer.pdf", "PDF · A4"],
          ["Bracelet sizer", "/size-guide/gem-experience-bracelet-sizer.pdf", "PDF · A4"],
        ] },
      { type: "steps", id: "rings", h: "Ring size", items: [
        ["Measure a ring you own", "Measure the inside diameter of a ring that fits the finger you want, in millimetres, and find it in the table."],
        ["Or measure your finger", "Wrap a strip of paper around the base of the finger, mark where it meets, and measure the length in millimetres. That is the circumference."],
        ["Measure at the end of the day", "Fingers are largest in the evening and when warm. If your knuckle is wider than the base of the finger, measure both and choose a size between them."],
      ] },
      { type: "table", head: ["Diameter (mm)", "Circumference (mm)", "UK", "US", "EU", "India"], rows: [
        ["14.9", "46.8", "H", "4", "47", "7"], ["15.3", "48.0", "I", "4½", "48", "8"], ["15.7", "49.3", "J½", "5", "49", "9"],
        ["16.1", "50.6", "K½", "5½", "51", "10"], ["16.5", "51.9", "L½", "6", "52", "12"], ["16.9", "53.1", "M½", "6½", "53", "13"],
        ["17.3", "54.4", "N½", "7", "54", "14"], ["17.7", "55.7", "O½", "7½", "56", "15"], ["18.1", "57.0", "P½", "8", "57", "16"],
        ["18.5", "58.3", "Q½", "8½", "58", "18"], ["19.0", "59.5", "R½", "9", "60", "19"], ["19.4", "60.8", "S½", "9½", "61", "20"],
        ["19.8", "62.1", "T½", "10", "62", "22"],
      ], note: "Conversions can differ slightly between countries. We confirm your size before a ring is made or altered." },
      { type: "steps", id: "bracelets", h: "Bracelet size", items: [
        ["Chain and tennis bracelets", "Measure around the wrist bone with a soft tape or a strip of paper. Add about 1.5 cm for a close fit, or 2 cm for a looser one."],
        ["Bangles", "Bring your thumb and little finger together and measure around the widest part of the hand, over the knuckles. A bangle has to pass over this."],
      ] },
      { type: "table", head: ["Bangle size", "Inside diameter (mm)", "Inside diameter (in)"], rows: [
        ["2.2", "54.0", "2 2⁄16"], ["2.4", "57.2", "2 4⁄16"], ["2.6", "60.3", "2 6⁄16"], ["2.8", "63.5", "2 8⁄16"], ["2.10", "66.7", "2 10⁄16"],
      ], note: "Indian bangle sizes give the inside diameter in sixteenths of an inch: 2.4 is 2 and 4⁄16 inches." },
      { type: "cta", h: "Not sure of your size?", p: "An adviser can help you find it, and High Jewellery is always made to measure.",
        actions: [["Speak to an adviser", "/contact/"], ["Book a private viewing", "/appointment/", true]] },
    ],
  },
};

function block(b) {
  switch (b.type) {
    case "split":
      return `    <section class="hp-split${b.flip ? " hp-split--flip" : ""}">
      <figure class="hp-split-img"><img src="${b.img}" alt="${esc(b.alt)}" loading="lazy" decoding="async"></figure>
      <div class="hp-split-copy">
        <h2 class="pg-section-title">${esc(b.h)}</h2>
        ${b.p.map((x) => `<p>${rich(x)}</p>`).join("\n        ")}
      </div>
    </section>`;
    case "text":
      return `    <section class="hp-text">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      ${b.p.map((x) => `<p>${rich(x)}</p>`).join("\n      ")}
    </section>`;
    // b.img / item images are paths without ".webp": each has a .w640 copy
    case "hero":
      return `    <figure class="hp-hero">
      <img src="${b.img}.webp" srcset="${b.img}.w640.webp 640w, ${b.img}.webp 2000w" sizes="(min-width: 1180px) 1180px, 100vw" alt="${esc(b.alt)}" decoding="async" fetchpriority="high">
    </figure>`;
    case "gallery":
      return `    <section class="hp-gallery">
      ${b.h ? `<h2 class="pg-section-title">${esc(b.h)}</h2>` : ""}
      <div class="hp-gallery-grid">
        ${b.items.map(([img, alt]) => `<figure><img src="${img}.webp" srcset="${img}.w640.webp 640w, ${img}.webp 1200w" sizes="(min-width: 900px) 33vw, 50vw" alt="${esc(alt)}" loading="lazy" decoding="async"></figure>`).join("\n        ")}
      </div>
    </section>`;
    case "pillars":
      return `    <section class="hp-pillars">
      ${b.items.map(([img, h, t]) => `<article>
        <figure><img src="${img}.webp" srcset="${img}.w640.webp 640w, ${img}.webp 1200w" sizes="(min-width: 900px) 50vw, 100vw" alt="" loading="lazy" decoding="async"></figure>
        <h2 class="pg-section-title">${esc(h)}</h2>
        <p>${rich(t)}</p>
      </article>`).join("\n      ")}
    </section>`;
    case "files":
      return `    <section class="hp-files">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      ${b.p ? `<p>${rich(b.p)}</p>` : ""}
      <ul>
        ${b.items.map(([label, href, meta]) => `<li><a href="${href}" target="_blank" rel="noopener"><span class="hp-file-name">${esc(label)}</span><span class="hp-file-meta">${esc(meta)}</span><span class="hp-file-go" aria-hidden="true">↓</span></a></li>`).join("\n        ")}
      </ul>
    </section>`;
    case "figures":
      return `    <section class="hp-figures">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <p class="pg-lede">${esc(b.p)}</p>
      <ul>
        ${b.items.map(([n, u, name]) => `<li><span class="hp-fig-n">${esc(n)}</span><span class="hp-fig-u">${esc(u)}</span><span class="hp-fig-name">${esc(name)}</span></li>`).join("\n        ")}
      </ul>
    </section>`;
    case "steps":
      return `    <section class="hp-steps" id="${b.id}">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <ol>
        ${b.items.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${rich(p)}</p></li>`).join("\n        ")}
      </ol>
    </section>`;
    case "table":
      return `    <section class="hp-table">
      <div class="hp-table-scroll"><table>
        <thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n          ")}
        </tbody>
      </table></div>
      ${b.note ? `<p class="pg-note">${esc(b.note)}</p>` : ""}
    </section>`;
    case "timeline":
      return `    <section class="hp-timeline">
      <ol>
        ${b.items.map(([when, h, p]) => `<li><span class="hp-when">${esc(when)}</span><h2>${esc(h)}</h2><p>${rich(p)}</p></li>`).join("\n        ")}
      </ol>
    </section>`;
    case "icons": {
      // each piece: two photographs and its description, sides alternating
      const shot = (i, n) => {
        const model = (i.model || []).includes(n);
        const src = `/icons/img/${i.slug}-${n}`;
        return `<figure class="hp-gi-shot${model ? " hp-gi-shot--model" : ""}">
            <img src="${src}.webp" srcset="${src}.w640.webp 640w, ${src}.webp 1200w" sizes="(min-width: 900px) 25vw, 50vw" alt="${esc(i.title)}${model ? ", worn" : ""}." loading="lazy" decoding="async">
          </figure>`;
      };
      const piece = (i) => {
        const enquire = `/quotation/?${i.ref ? `ref=${encodeURIComponent(i.ref)}&amp;` : ""}name=${encodeURIComponent("GE Icons · " + i.title + " (" + i.facts + ")")}`;
        return `<article class="hp-gi" id="${i.slug}">
        <div class="hp-gi-media">
          ${shot(i, 1)}
          ${shot(i, 2)}
        </div>
        <div class="hp-gi-copy">
          <p class="hp-gi-kind">${esc(i.kind)}</p>
          <h2 class="hp-gi-title">${esc(i.title)}</h2>
          <p class="hp-gi-facts">${esc(i.facts)}</p>
          ${i.spec ? `<p class="hp-gi-spec">${i.ref ? `${esc(i.ref)} · ` : ""}${esc(i.spec)}</p>` : ""}
          ${i.p.map((t) => `<p>${esc(t)}</p>`).join("\n          ")}
          <div class="pg-actions">
            <a class="pg-btn" href="${enquire}">Request a quotation</a>
            <a class="pg-btn pg-btn--ghost" href="/appointment/">Book a private viewing</a>
          </div>
        </div>
      </article>`;
      };
      return `    <section class="hp-gis">
      ${ICONS.map(piece).join("\n      ")}
    </section>`;
    }
    case "cta":
      return `    <section class="hp-cta">
      <h2 class="pg-section-title">${esc(b.h)}</h2>
      <p class="pg-note">${esc(b.p)}</p>
      <div class="pg-actions">
        ${b.actions.map(([l, h, ghost]) => `<a class="pg-btn${ghost ? " pg-btn--ghost" : ""}" href="${h}">${esc(l)}</a>`).join("\n        ")}
      </div>
    </section>`;
    default:
      throw new Error("unknown block " + b.type);
  }
}

function page(slug, p) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} — Gem Experience</title>
<meta name="description" content="${esc(p.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;700&display=swap"></noscript>
<link rel="stylesheet" href="/css/pages.css">
<link rel="stylesheet" href="/css/site-nav.css">
<link rel="stylesheet" href="/css/mini-cart.css">
<link rel="stylesheet" href="/css/gift-note.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/css/house.css?v=3">
</head>
<body class="pg">
<!-- Written by tools/build-house-pages.mjs; edit the content there, not here. -->
<div class="pg-wrap">
  <div id="pg-header"></div>
  <header class="pg-hero">
    <span class="pg-kicker">${esc(p.kicker)}</span>
    <h1 class="pg-title">${esc(p.title)}</h1>
    <p class="pg-lede">${esc(p.lede)}</p>
  </header>
  <main class="pg-main hp">
${p.blocks.map(block).join("\n\n")}
  </main>
  <div id="pg-footer"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"></script>
<script src="/js/config.js"></script>
<script src="/js/gem.js"></script>
<script src="/js/site-footer.js"></script>
<script src="/js/site-content.js"></script>
<script src="/js/site-nav.js"></script>
<script src="/js/mini-cart.js"></script>
<script src="/js/gift-note.js"></script>
<script src="/js/shell.js"></script>
<script>GemShell.mount({ prefix: "/" });</script>
<script src="/js/analytics.js" defer></script>
</body>
</html>
`;
}

for (const [slug, p] of Object.entries(PAGES)) {
  const file = path.join(WEB, slug, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // keep the head tags build-seo.mjs added on an earlier run
  let html = page(slug, p);
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, "utf8");
    const m = old.match(/<!-- seo -->[\s\S]*?<!-- \/seo -->\n/);
    if (m) html = html.replace("</head>", m[0] + "</head>");
  }
  fs.writeFileSync(file, html);
}
console.log(Object.keys(PAGES).length + " pages written: " + Object.keys(PAGES).map((s) => "/" + s + "/").join(" "));
