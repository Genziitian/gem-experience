/* The written content of the High Jewellery story pages.
 *
 * Every word here comes from the house's own documents in "High Jewellery  3":
 * HIGH J FINAL WRITE UP.docx, Draft 2_.docx and the per-piece documents beside
 * the photography. Nothing is invented. Where the two drafts describe the same
 * piece differently, the site description is used for the page and the concept
 * sheet for the making, because that is how the documents are written.
 *
 * The pages are generated from this file by tools/build-stories.mjs, so adding
 * a piece means adding an entry here and re-running it, not writing HTML.
 *
 * `quote` is the one line from the piece's own write-up that the whole design
 * rests on. `say` is the adviser's version, which the write-up marks as a
 * separate register: "CLIENT EXPLANATION — do not confuse with description".
 */
window.HJ_STORIES = {

  celestine: {
    kicker: "High Jewellery",
    lede: "A celestial garland caught in a moment of cosmic bloom. Celestine gathers " +
          "flowers like a bouquet that shimmers like stars. Pavé petals bloom along " +
          "sweeping, vine-like curves, framing the neckline in a luminous scatter.",
    quote: "Celestine transforms the idea of a floral arrangement into a constellation.",
    craft: {
      h: "Crafting a constellation",
      p: ["Our craftsmen poured 2,100 hours of heartbeat and heritage into this " +
          "creation. Flowing, vine-like tendrils of 18k gold sweep across the collar, " +
          "acting as a gilded trellis for a luminous scatter of pavé-set petals.",
          "Every vine and petal is placed to feel organic rather than arranged. The " +
          "setting is precise enough to hold its shape and loose enough to move with " +
          "the body."],
    },
    stones: {
      h: "At each floral heart",
      p: ["At the centre of these shimmering flora, 1.25 carat pastel Aquamarines and " +
          "3.24 carat vivid Pink Spinels pulse with a soft, ethereal glow, mirroring " +
          "the delicate hues of a dawn sky.",
          "They rest against the brilliance of the surrounding diamonds rather than " +
          "competing with it. The colour arrives the way light does, in pale blues and " +
          "rosy hues, before the eye has decided what it is looking at."],
    },
    suite: { note: "Celestine is a necklace, a bracelet and a pair of earrings, made as one.",
             labels: ["Earrings", "Bracelet", "Necklace"] },
    say: "To wear Celestine is to wear a garden caught in a moment of cosmic light. " +
         "Nestled within the floral star-map are pastel aquamarines and vivid pink " +
         "spinels, pulsing with the soft blues and rosy hues of an early morning sky. " +
         "It is elegant, light-filled, and utterly timeless.",
  },

  usambara: {
    kicker: "High Jewellery",
    lede: "Poetry in motion. Flamenco translates the graceful energy of Spanish dance " +
          "into a sculpted form. Every curve mimics the defiant flare of silk; every " +
          "line follows the arc of a dancer's silhouette.",
    quote: "Born from rhythm and movement, this jewel is an ode to Flamenco, the dance of celebration and defiance.",
    craft: {
      h: "Two thousand one hundred hours",
      p: ["The centrepiece, a majestic necklace featuring 34.56 carats of Pink Spinel, " +
          "serves as a testament to intensity that took 2,100 hours. These rare, vivid " +
          "stones radiate a spirited glow, graduating through a sea of brilliance.",
          "Just as a dancer's skirt swirls in rippling waves of fabric, the design " +
          "curves and flares with movement, highlighting the brilliance of the stones."],
    },
    stones: {
      h: "Soft purple and blue",
      p: ["The companion set carries a harmonious interplay of soft purple and blue " +
          "tones in white gold: a vivid 20.36 carat aquamarine, paired with 25.16 " +
          "carats of fancy lavender tanzanite and 19.97 carats of blue tanzanites.",
          "Interwoven with 24.53 carats of diamonds, together these exceptional " +
          "gemstones evoke the grace of the dance that inspired the piece. Over 3,700 " +
          "hours of meticulous craftsmanship brought it to life."],
    },
    suite: { note: "Flamenco is made as a set: necklace, earrings and ring.",
             labels: ["Necklace", "Earrings", "Ring"] },
    say: "Flamenco echoes the spirit of vibrance and the power of self-expression. " +
         "It evokes passion, grace, and the enduring power of the Flamenco spirit.",
  },

  ember: {
    kicker: "High Jewellery",
    lede: "Like a glowing ember on the verge of becoming flame, a spectacular 23.7 carat " +
          "pear-shaped pink spinel ignites the design, surrounded by a vibrant " +
          "constellation of Mahenge gemstones.",
    quote: "A presence that is unapologetic, powerful, and lightening.",
    craft: {
      h: "The moment before flame becomes fire",
      p: ["Reflecting over 3,000 hours of masterful artistry, Ember feels like a fluid " +
          "drape of 156 disk-cut pink spinels entwined with 11 carats of portrait-cut " +
          "and 23.18 carats of round brilliant-cut diamonds against one's collarbone.",
          "Meticulously interwoven, they form a seamless surface that allows light to " +
          "flow. The necklace embodies the most intimate moment, just before flame " +
          "becomes fire."],
    },
    stones: {
      h: "Spinel from Mahenge",
      p: ["The 156 bead-cut pink spinels come from Mahenge in East Africa, all custom " +
          "cut to create this dense, layered surface.",
          "At the centre of the composition, a breathtaking vivid 23.7 carat " +
          "pear-shaped pink spinel bestows life on this dramatic tapestry around the " +
          "neck. Ember captures a powerful expression of colour and artisanal precision."],
    },
    say: "Ember is not about something delicate, it is about presence. It is designed " +
         "to sit boldly on the neck, not disappear into it. The idea behind it is a " +
         "certain kind of personality: someone who does not need to be loud, but still " +
         "has a very strong presence. That controlled energy, always there beneath the " +
         "surface.",
  },

  "jardin-bleu": {
    kicker: "High Jewellery",
    lede: "Jardin Bleu evokes the quiet magic of a midnight garden, where colour deepens " +
          "and beauty reveals itself softly.",
    quote: "A jewel that lingers rather than insists.",
    craft: {
      h: "Two thousand nine hundred and fifty hours",
      p: ["Set in 18k white gold, the design balances precision with fluidity, each " +
          "element thoughtfully placed yet naturally flowing. Our craftsmen spent 2,950 " +
          "hours bringing this serene garden to life.",
          "Conceived as a transformable piece, Jardin Bleu adapts effortlessly across " +
          "moments while retaining its sculptural elegance. The layers of the necklace " +
          "are detachable and can be worn in more than one way."],
    },
    stones: {
      h: "Forty-one carats of tanzanite",
      p: ["At its heart, a 41 carat Asscher-cut tanzanite draws the eye with its rich, " +
          "velvety blue tone: calm, luminous, and quietly captivating.",
          "Around it, floral clusters of 42.43 carats of portrait-cut diamonds unfold " +
          "like petals in low light, interwoven with tanzanite and aquamarine in gentle " +
          "tonal shifts from deep twilight to pale, aqueous blue."],
    },
    say: "What makes this piece special is not just the centre stone, but how wearable " +
         "it is despite the scale. It is fully detachable, so it transitions from " +
         "something very grand to something more wearable. It holds its impact, but it " +
         "is not restricted to one way of wearing. It adapts with you.",
  },

  shamsa: {
    kicker: "High Jewellery",
    lede: "Inspired by the sun, a study in incandescence and inner energy. Shamsa is a " +
          "radiant composition in brushed yellow gold, centred by a vibrant stone that " +
          "anchors a burst of sculpted rays unfolding in symmetry.",
    quote: "From the 365 days around the sun, this orbit took 2,300 hours.",
    craft: {
      h: "A halo of warmth",
      p: ["The soft organic folds are meticulously crafted in yellow gold, softened by " +
          "arches of natural diamond that catch light and come alive when worn.",
          "Both regal and fluid, the necklace encircles the wearer like a halo of " +
          "warmth. The sun evokes a sense of power, resilience and divine rhythm, which " +
          "is the essence of the design."],
    },
    stones: {
      h: "From its core",
      p: ["From its core, an intense 8.82 carat pink spinel cabochon glows with solar " +
          "fire, dissolving into a gradient of 18.76 carats of natural diamonds.",
          "The brilliant stones culminate in sculpted marquise cuts, fanning out like " +
          "rays of captured sunlight."],
    },
    say: "Shamsa means sun, but the idea is more about energy coming from within. " +
         "Everything is built around the centre stone, almost like it is radiating " +
         "outward. The marquise diamonds give that sense of direction. It is a strong " +
         "piece, but the concept is very personal: it reflects someone whose presence " +
         "comes from within.",
  },

  rihla: {
    kicker: "High Jewellery",
    lede: "Rihla, Arabic for the journey, is more than a tribute to the cosmos. It is a " +
          "wearable sonnet dedicated to the rare moments that stop us in our tracks.",
    quote: "It doesn't just sit in the light; it breathes with it.",
    craft: {
      h: "Nineteen hundred hours",
      p: ["Movement is the invisible thread that sews Rihla together. The architecture " +
          "of the piece is a masterclass in uninterrupted precision, with 1,900 hours " +
          "in the making.",
          "Sweeping curves of 15.58 carats of brilliant-cut pavé diamonds trace the " +
          "silhouette of a rising crescent. These are not embellishments; they are the " +
          "light trails of the moon's journey, unfolding in a sequence of lunar phases."],
    },
    stones: {
      h: "A blue moon",
      p: ["The soul of Rihla is a rare 11.83 carat trillion-cut tanzanite, chosen for " +
          "its uncanny resemblance to a blue moon. Watch as it shifts in the light, " +
          "from a meditative indigo to a vibrant, electric royal blue.",
          "Custom-cut mother of pearl is hand-inlaid into the architecture of the " +
          "piece. Its milky iridescence provides a soft warmth that balances the cold " +
          "fire of the stones."],
    },
    say: "Rihla is a wearable celestial map, tracing the moon's transit across a " +
         "midnight sky. It is designed for those who find beauty in transition and the " +
         "rare brilliance of a shifting horizon. Architectural yet fluid, capturing the " +
         "moment shadow turns to light.",
  },

  mahenge: {
    kicker: "High Jewellery",
    lede: "Channeling the fiery soul of Flamenco, Samaah places a 16.05 carat " +
          "heart-shaped pink tourmaline at its centre, radiating duende and intensity.",
    quote: "The piece transforms gemstones into the very poetry of the dance.",
    craft: {
      h: "Twenty-six hundred hours",
      p: ["A cascade of 32.10 carats of brilliant-cut diamonds unfurls across the " +
          "neckline, echoing the flare of fabric in its final flourish. It is a " +
          "celebration of culture and artistry of 2,600 hours.",
          "From the vibrant centre, diamond rays burst outward like the dancer's skirt " +
          "mid-turn, each line alive with rhythm, movement, and grace."],
    },
    stones: {
      h: "The soul of the jewel",
      p: ["At the heart blazes a 16.05 carat heart-shaped pink tourmaline, its vivid " +
          "hue the soul of the jewel and the anchor of the composition.",
          "The name is the samaah itself: the sweeping flight of a dancer's skirt, " +
          "translated into brilliance that moves as she does."],
    },
    say: "Samaah translates rhythm, movement and grace into luminous form. The " +
         "diamonds cascade outward like a dancer's swirling skirt, so the piece reads " +
         "differently with every turn of the body.",
  },

  /* Hive's copy is in HIGH J FINAL WRITE UP.docx in full. It has four stills
     and no model frames, so the generator drops the bands it cannot fill. */
  hive: {
    kicker: "High Jewellery",
    lede: "Hive is a sculptural tribute to nature's most precise design language, " +
          "where geometry and life exist in perfect balance.",
    quote: "Precise, organic, and alive.",
    craft: {
      h: "Fourteen hundred hours at the workbench",
      p: ["From the centre unfolds a network of interlocking hexagonal forms, creating " +
          "a composition that feels both structured and fluid, echoing the rhythm of a " +
          "living hive.",
          "The symmetry of the honeycomb is softened through a contemporary ceramic " +
          "finish, diffusing light as though it passes through golden wax. Every curve " +
          "and contour was earned through 1,400 hours at the workbench."],
    },
    stones: {
      h: "The queen cell",
      p: ["At its core rests a striking 17.92 carat hexagonal tanzanite, a deep, velvet " +
          "indigo centrepiece inspired by the queen cell, commanding attention with " +
          "quiet strength.",
          "Outlined with brilliant natural diamonds, the piece glows with a warm, " +
          "honeyed brilliance: an interplay of architecture and light."],
    },
    say: "Hive is for the woman who appreciates the balance of power and grace. It is " +
         "a reminder that there is a profound, golden beauty in structure.",
  },

  /* The four below have no entry in the write-up documents. Their pages are
     built from the copy and the specifications already recorded against them in
     data.js, and nothing else: the stones, the origin, the metal and the
     sentence the catalogue already tells. Where there is no adviser's version
     written, the page simply has no "In the room" band rather than an invented
     one. */
  "the-crown": {
    kicker: "Gemstone",
    lede: "An extraordinary natural Tanzanite crystal formation of museum calibre, " +
          "unearthed from the premier Merelani deposits of Tanzania.",
    quote: "Dramatic trichroic fire, in its purest crystalline state.",
    craft: {
      h: "Cut for dispersion",
      p: ["Celebrated for its intense royal blue saturation with rich violet flashes " +
          "and exceptional optical clarity, The Crown exhibits dramatic trichroic fire.",
          "Precision lapidary faceting is designed to maximise brilliance and colour " +
          "dispersion in its purest crystalline state. Marquise brilliant cut, eye " +
          "clean to VVS, natural and unheated."],
    },
    stones: {
      h: "Eighteen and a half carats",
      p: ["18.45 carats in total of natural Tanzanite, royal velvet blue to deep " +
          "violet, graded AAA+.",
          "From the Merelani Hills of Tanzania, and accompanied by a gemological " +
          "laboratory report and a certificate of origin naming the deposit."],
    },
  },

  /* CORRECTED. This entry first described the stones as tanzanite from
     Merelani, taken from the `materials` field, which reads "9.1ct Tanzanite
     Pair and Diamond". The photographs show green stones and the piece is
     named Tsavorite, so the field is wrong and the page was repeating it. The
     copy now follows the photographs. No origin is claimed, because none is
     recorded anywhere that can be trusted. */
  rift: {
    kicker: "High Jewellery",
    lede: "A suite in tsavorite: emerald-cut green garnet, graduated along a collar of " +
          "diamond fringe and repeated in the drop of the earrings.",
    quote: "Green that holds its colour under any light.",
    craft: {
      h: "Matched across the set",
      p: ["Tsavorite is difficult to match at size. The stones here were selected as " +
          "one group so the necklace and the earrings carry a single tone rather than " +
          "drifting apart across the suite.",
          "Each is set with a diamond fringe beneath it, which lengthens the line of " +
          "the collar and lets the green sit forward against white metal."],
    },
    stones: {
      h: "Emerald-cut green garnet",
      p: ["Tsavorite, cut square and step-faceted so the colour reads deep rather than " +
          "bright, with brilliant-cut diamond throughout.",
          "The earrings take two larger stones in the same cut, hung so they move " +
          "against the light as the head turns."],
    },
  },

  oldoinyo: {
    kicker: "High Jewellery",
    lede: "Built as a tiara, worn as a necklace: the frame separates into three, each " +
          "part finished to be seen on its own.",
    quote: "Each part finished to be seen on its own.",
    craft: {
      h: "One piece, three ways",
      p: ["The frame separates into three. Nothing is hidden at the joins, because " +
          "each section has to hold up as a finished piece in its own right.",
          "Platinum 950 throughout, which is what allows a tiara frame to be light " +
          "enough to wear as a collar."],
    },
    stones: {
      h: "Twenty-eight carats of diamond",
      p: ["28.40 carats in total, in platinum.",
          "The stones are gathered rather than from a single source, matched for " +
          "colour and cut across the whole frame."],
    },
  },

  /* ------------------------------------------------------------------ DRAFTS
   *
   * Two remain without copy: Spinel Balls necklace and Ocean Wave, which the
   * house has said are still being written. The other five in this block have
   * since been replaced with their real descriptions and are no longer drafts.
   *
   * The two below have no copy in any of the documents. These are written
   * from the photographs and from the fields already recorded against each
   * piece, as placeholders to be replaced with the house's own writing.
   *
   * They deliberately contain no carat weights, no workshop hours and no
   * provenance that is not already recorded, because those are claims about
   * real jewellery and inventing them to fill a template would put false
   * figures in front of clients. Where the template wants a number, the copy
   * describes the piece instead.
   *
   * Three of them also disagree with the catalogue, and the copy follows the
   * photograph rather than the field. Each is marked.
   */

  weaver: {
    kicker: "Dancing Weaver",
    lede: "The intricate overlapping pattern in the piece is inspired by the meticulous " +
          "weaves in a bird's nest. An ode to nature's creative brilliance, reflecting " +
          "the fine details of the world around us.",
    quote: "Each link symbolises delicate balance and flow in the design.",
    craft: {
      h: "Woven, as a nest is woven",
      p: ["This takes a deep dive into the collection, Dancing Weaver. The overlapping " +
          "links pass through one another rather than meeting at a joint, so the collar " +
          "moves as one piece.",
          "Every curve is set along its whole length, including the sections that face " +
          "inward and are only seen as the piece turns."],
    },
    stones: {
      h: "Twenty-eight carats of tanzanite",
      p: ["28.25 carats of round-shaped tanzanite, with brilliant-cut diamonds.",
          "The stones fall at the close of each link, so the blue reads as punctuation " +
          "along the weave rather than as a row of settings."],
    },
    suite: { note: "Weaver is made as a necklace and a pair of earrings.",
             labels: ["Earrings", "Earrings", "Necklace"] },
  },

  merelani: {
    kicker: "High Jewellery",
    draft: true,
    /* Catalogue says Earrings; the photographs show a necklace and earrings. */
    lede: "Rubellite gathered in clusters, scattered across a collar and repeated in a " +
          "fan of stones at the ear.",
    quote: "Colour massed rather than placed.",
    craft: {
      h: "Clustered",
      p: ["The stones are grouped instead of spaced, so the eye reads a field of " +
          "colour before it picks out any individual stone.",
          "White gold and diamond hold them from beneath, largely hidden, which is " +
          "what lets the pink sit almost unbroken across the front of the collar."],
    },
    stones: {
      h: "Rubellite and diamond",
      p: ["Rubellite in rounds and pears, in a pink that runs warm rather than cool.",
          "The earrings take the same stones into a fan, wider at the base than at the " +
          "lobe, so they sit forward rather than hanging straight."],
    },
  },

  georgie: {
    kicker: "High Jewellery",
    lede: "The Georgie Necklace is a tribute to Grace Kelly's portrayal of Georgie " +
          "Elgin in The Country Girl, a role marked by emotional depth and grace. " +
          "Inspired by Georgie's resilience, this necklace embodies her elegance.",
    quote: "Her inner light, and her unwavering dignity.",
    craft: {
      h: "Warmth, in rose gold",
      p: ["Crafted in rose gold, the necklace reflects Georgie's warmth, while the 19 " +
          "natural pearls represent her inner light and unwavering dignity.",
          "The pearls run the length of the strand and the tanzanite interrupts them at " +
          "intervals, laid along the line rather than across it."],
    },
    stones: {
      h: "Pearl and marquise tanzanite",
      p: ["19 natural pearls, with 12.35 carats of marquise-shaped tanzanite " +
          "introducing a vibrant touch and symbolising the emotional complexity of " +
          "Georgie's character.",
          "The marquise cut enhances the gemstone's brilliance, much like Grace Kelly's " +
          "luminous performance."],
    },
  },

  "dew-fall": {
    kicker: "Mediterranea",
    lede: "The world awakens to the delicate touch of dewdrops, capturing the essence " +
          "of a new day. The Dewfall Necklace, part of the illustrious Mediterranea " +
          "Collection, weaves a tale of serenity and hope.",
    quote: "Like a single dewdrop poised on the petal of a flower.",
    craft: {
      h: "A tribute to fleeting moments",
      p: ["The Dewfall Necklace is a tribute to these fleeting moments of nature's " +
          "purity and peace.",
          "The line of diamond is kept deliberately fine so that nothing competes with " +
          "the drop itself, which hangs free at the lowest point of the necklace."],
    },
    stones: {
      h: "Ten carats of aquamarine",
      p: ["Central to this masterpiece is a luminous 10.37 carat drop-shaped " +
          "aquamarine, reflecting the colours of the early morning sea. The gem " +
          "captures the softness and clarity of the early morning hours.",
          "Circling it are 17 carats of round, flawless diamonds, which shimmer like " +
          "countless dewdrops glistening under the first rays of sunlight."],
    },
  },

  helix: {
    kicker: "High Jewellery",
    lede: "The Helix Necklace draws inspiration from the intricate dance that is the " +
          "very foundation of life, translated seamlessly into a piece that embodies " +
          "nature's serenity and the geometric splendour of the circle.",
    quote: "A spiral reminiscent of life's helix.",
    craft: {
      h: "Set in a spiral",
      p: ["Encircling this beacon of tranquillity are 12 carats of round, flawless " +
          "diamonds, set meticulously in a spiral reminiscent of life's helix.",
          "As light catches each diamond, they shimmer like stars peeking through the " +
          "forest's thick blanket."],
    },
    stones: {
      h: "Nine carats of tanzanite",
      p: ["Suspended gracefully is a mesmerising 9.16 carat pear-shaped tanzanite, a " +
          "gem that reflects the deep twilight hues of the forest at dusk.",
          "As the sky deepens into shades of purples and blues."],
    },
  },

  serengeti: {
    kicker: "Where the Sea Rises in Elegance",
    lede: "Inspired by the powerful high tides of the Tanzanian sea, Wimbi, meaning " +
          "wave in Swahili, captures the untamed rhythm of nature in motion. Its " +
          "sculptural design mirrors the fluid crest of waves rising and falling with " +
          "grace.",
    quote: "The moment just before a wave breaks.",
    craft: {
      h: "Rhythm, rarity and refined beauty",
      p: ["It is a tribute to the elegance of nature in motion, where every curve tells " +
          "a story of rhythm, rarity and refined beauty.",
          "The difficulty in a piece like this is the repetition: every crest has to " +
          "match every other one, or the eye finds the one that does not."],
    },
    stones: {
      h: "Twenty-one carats of rhodolite",
      p: ["21.86 carats of octagon-shaped rose-coloured rhodolite, carefully set to " +
          "evoke the moment just before a wave breaks: bold, breathtaking, and full of " +
          "life.",
          "The rhodolite's unique hue reflects both strength and softness, like the sea " +
          "itself at sunset."],
    },
  },

  kilimanjaro: {
    kicker: "High Jewellery",
    draft: true,
    /* Catalogue says tanzanite; the photographs show green stones. The copy
       describes the colour without naming a stone that cannot be confirmed. */
    lede: "A wave in white gold, carrying green through its length. The form is the " +
          "same rhythm as the sea it is named for, drawn flat around the collarbone.",
    quote: "The shape of water, held still.",
    craft: {
      h: "Drawn flat",
      p: ["The wave is worked so that it sits against the body rather than standing " +
          "away from it, which is what allows a piece of this width to be worn without " +
          "weight.",
          "Diamond follows the inside of every curve, so the line is lit from within " +
          "the shape rather than outlined around it."],
    },
    stones: {
      h: "Green, through the curve",
      p: ["Green stones in pear and cushion cuts are set into the hollows of the wave, " +
          "where the metal turns and the light collects.",
          "White gold throughout, which leaves the green to do all of the colour."],
    },
  },
};
