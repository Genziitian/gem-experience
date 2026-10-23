/* High Jewellery catalog.
   Extracted from app.js so the admin can read and rewrite it as data:
   the file is a single JSON object after the assignment, nothing else. */
window.HJ_DATA = {
  "collections": [
    {
      "id": "tanzania-universe",
      "name": "Tanzania Universe"
    },
    {
      "id": "origin",
      "name": "Origin"
    },
    {
      "id": "nocturne",
      "name": "Nocturne"
    },
    {
      "id": "heritage",
      "name": "Heritage"
    }
  ],
  "types": [
    "Gemstones",
    "Necklaces",
    "Earrings"
  ],
  "occasions": [
    "Bridal",
    "Gala",
    "Collector",
    "Gifting"
  ],
  "products": [
    {
      "id": "weaver",
      "name": "Weaver",
      "materials": "28.25ct Tanzanite and Diamond",
      "type": "Necklaces",
      "collection": "Origin",
      "occasion": "Gala",
      "carat": "28.25ct",
      "origin": "—",
      "metal": null,
      "ref": "—",
      "story": "",
      "visualiser": {
        "color": "#1e4a8c",
        "accent": "#6b3fa0",
        "ior": 1.7,
        "cut": "brilliant",
        "cutLabel": "Brilliant cut",
        "attenuation": 0.5
      },
      "gallery": [
        "img/pieces/weaver/p1.webp",
        "img/pieces/weaver/p2.webp",
        "img/pieces/weaver/p3.webp",
        "img/pieces/weaver/p4.webp"
      ],
      "models": [
        "img/pieces/weaver/m1.webp",
        "img/pieces/weaver/m2.webp",
        "img/pieces/weaver/m3.webp",
        "img/pieces/weaver/m4.webp",
        "img/pieces/weaver/m5.webp",
        "img/pieces/weaver/m6.webp",
        "img/pieces/weaver/m7.webp",
        "img/pieces/weaver/m8.webp"
      ],
      "storyUrl": "/high-jewellery/weaver/",
      "storyLabel": "Explore Weaver",
      "card": "img/weaver-set.webp"
    },
    {
      "id": "the-crown",
      "name": "The Crown",
      "materials": "18.45ct Royal Blue Tanzanite",
      "type": "Gemstones",
      "collection": "Heritage",
      "occasion": "Collector",
      "gemstone": "Natural Tanzanite",
      "carat": "18.45ct total",
      "origin": "Merelani Hills, Tanzania",
      "metal": null,
      "cut": "Marquise Brilliant Cut",
      "colour": "Royal Velvet Blue / Deep Violet (AAA+)",
      "colourSummary": "Royal Blue",
      "clarity": "Eye Clean (VVS)",
      "treatment": "Natural / Unheated",
      "certification": "Gemological Lab Report & Certificate of Origin",
      "ref": "GEM-CRW-104",
      "story": "An extraordinary natural Tanzanite crystal formation of museum calibre, unearthed from the premier Merelani deposits of Tanzania. Celebrated for its intense royal blue saturation with rich violet flashes and exceptional optical clarity, The Crown exhibits dramatic trichroic fire and precision lapidary faceting designed to maximize brilliance and color dispersion in its purest crystalline state.",
      "isGemstone": true,
      "visualiser": {
        "color": "#153a7a",
        "accent": "#5a2d8e",
        "ior": 1.7,
        "cut": "marquise",
        "cutLabel": "Marquise brilliant",
        "attenuation": 0.45
      },
      "gallery": [
        "img/pieces/the-crown/p1.webp",
        "img/pieces/the-crown/p2.webp",
        "img/pieces/the-crown/p3.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/the-crown/",
      "storyLabel": "Explore The Crown",
      "card": "img/the-crown-set.webp"
    },
    {
      "id": "shamsa",
      "name": "Shamsa",
      "materials": "8.82ct Pink Spinel and Diamond",
      "type": "Earrings",
      "collection": "Nocturne",
      "occasion": "Gala",
      "carat": "8.82ct pink spinel (necklace)",
      "origin": "—",
      "metal": "18k Yellow Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/shamsa/p1.webp",
        "img/pieces/shamsa/p2.webp",
        "img/pieces/shamsa/p3.webp",
        "img/pieces/shamsa/p4.webp",
        "img/pieces/shamsa/p5.webp"
      ],
      "models": [
        "img/pieces/shamsa/m1.webp",
        "img/pieces/shamsa/m2.webp",
        "img/pieces/shamsa/m3.webp",
        "img/pieces/shamsa/m4.webp",
        "img/pieces/shamsa/m5.webp",
        "img/pieces/shamsa/m6.webp"
      ],
      "storyUrl": "/high-jewellery/shamsa/",
      "storyLabel": "Explore Shamsa",
      "card": "img/shamsa-set.webp"
    },
    {
      "id": "jardin-bleu",
      "name": "Jardin Bleu",
      "materials": "41ct Tanzanite, Aquamarine and Diamond",
      "type": "Necklaces",
      "collection": "Origin",
      "occasion": "Collector",
      "carat": "41ct",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "visualiser": {
        "color": "#2456a0",
        "accent": "#7a4cb0",
        "ior": 1.7,
        "cut": "pear",
        "cutLabel": "Pear cut",
        "attenuation": 0.55
      },
      "gallery": [
        "img/pieces/jardin-bleu/p1.webp",
        "img/pieces/jardin-bleu/p2.webp",
        "img/pieces/jardin-bleu/p3.webp",
        "img/pieces/jardin-bleu/p4.webp",
        "img/pieces/jardin-bleu/p5.webp"
      ],
      "models": [
        "img/pieces/jardin-bleu/m1.webp",
        "img/pieces/jardin-bleu/m2.webp",
        "img/pieces/jardin-bleu/m3.webp",
        "img/pieces/jardin-bleu/m4.webp"
      ],
      "storyUrl": "/high-jewellery/jardin-bleu/",
      "storyLabel": "Explore Jardin Bleu",
      "card": "img/jardin-bleu-set.webp"
    },
    {
      "id": "hive",
      "name": "Hive",
      "materials": "17.92ct Tanzanite, Ceramic and Diamond",
      "type": "Necklaces",
      "collection": "Tanzania Universe",
      "occasion": "Gala",
      "carat": "17.92ct",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/hive/p1.webp",
        "img/pieces/hive/p2.webp",
        "img/pieces/hive/p3.webp",
        "img/pieces/hive/p4.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/hive/",
      "storyLabel": "Explore Hive",
      "card": "img/hive-set.webp"
    },
    {
      "id": "georgie",
      "name": "Georgie",
      "materials": "12.35ct Tanzanite and 19 Natural Pearls",
      "type": "Necklaces",
      "collection": "Heritage",
      "occasion": "Gifting",
      "carat": "12.35ct",
      "origin": "—",
      "metal": "18k Rose Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/georgie/p1.webp",
        "img/pieces/georgie/p2.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/georgie/",
      "storyLabel": "Explore Georgie"
    },
    {
      "id": "usambara",
      "name": "Flamenco",
      "materials": "34.56ct Pink Spinel, Aquamarine, Tanzanite and Diamond",
      "type": "Necklaces",
      "collection": "Nocturne",
      "occasion": "Collector",
      "carat": "34.56ct pink spinel",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "GD26-229 · GD26-229 A (aquamarine and tanzanite set)",
      "story": "",
      "gallery": [
        "img/pieces/usambara/p1.webp",
        "img/pieces/usambara/p2.webp",
        "img/pieces/usambara/p3.webp",
        "img/pieces/usambara/p4.webp",
        "img/pieces/usambara/p5.webp",
        "img/pieces/usambara/p6.webp",
        "img/pieces/usambara/p7.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/usambara/",
      "storyLabel": "Explore Flamenco",
      "card": "img/usambara-set.webp"
    },
    {
      "id": "ember",
      "name": "Ember",
      "materials": "23.7ct Pink Spinel and Diamond",
      "type": "Earrings",
      "collection": "Tanzania Universe",
      "occasion": "Gala",
      "carat": "23.7ct pink spinel (necklace)",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "visualiser": {
        "color": "#9b1c3a",
        "accent": "#d4546a",
        "ior": 1.62,
        "cut": "emerald",
        "cutLabel": "Emerald cut",
        "attenuation": 0.6
      },
      "gallery": [
        "img/pieces/ember/p1.webp",
        "img/pieces/ember/p2.webp",
        "img/pieces/ember/p3.webp",
        "img/pieces/ember/p4.webp",
        "img/pieces/ember/p5.webp"
      ],
      "models": [
        "img/pieces/ember/m1.webp",
        "img/pieces/ember/m2.webp",
        "img/pieces/ember/m3.webp"
      ],
      "storyUrl": "/high-jewellery/ember/",
      "storyLabel": "Explore Ember",
      "card": "img/ember-set.webp"
    },
    {
      "id": "dew-fall",
      "name": "Dew Fall",
      "materials": "10.37ct Aquamarine and Diamond",
      "type": "Necklaces",
      "collection": "Origin",
      "occasion": "Collector",
      "carat": "10.37ct",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/dew-fall/p1.webp",
        "img/pieces/dew-fall/p2.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/dew-fall/",
      "storyLabel": "Explore Dew Fall"
    },
    {
      "id": "celestine",
      "name": "Celestine",
      "materials": "1.25ct Aquamarine, 3.24ct Pink Spinel and Diamond",
      "type": "Earrings",
      "collection": "Tanzania Universe",
      "occasion": "Gifting",
      "carat": "1.25ct aquamarine · 3.24ct pink spinel",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/celestine/p1.webp",
        "img/pieces/celestine/p2.webp",
        "img/pieces/celestine/p3.webp",
        "img/pieces/celestine/p4.webp",
        "img/pieces/celestine/p5.webp",
        "img/pieces/celestine/p6.webp",
        "img/pieces/celestine/p7.webp",
        "img/pieces/celestine/p8.webp"
      ],
      "models": [
        "img/pieces/celestine/m1.webp",
        "img/pieces/celestine/m2.webp",
        "img/pieces/celestine/m3.webp",
        "img/pieces/celestine/m4.webp",
        "img/pieces/celestine/m5.webp",
        "img/pieces/celestine/m6.webp",
        "img/pieces/celestine/m7.webp",
        "img/pieces/celestine/m8.webp",
        "img/pieces/celestine/m9.webp"
      ],
      "storyUrl": "/high-jewellery/celestine/",
      "storyLabel": "Explore Celestine",
      "card": "img/celestine-set.webp"
    },
    {
      "id": "merelani",
      "name": "Rosette",
      "materials": "36.5ct Pink Spinel and Diamond",
      "type": "Necklaces",
      "collection": "Tanzania Universe",
      "occasion": "Bridal",
      "carat": "36.5ct",
      "origin": "—",
      "metal": "18k White and Rose Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/merelani/p1.webp",
        "img/pieces/merelani/p2.webp",
        "img/pieces/merelani/p3.webp",
        "img/pieces/merelani/p4.webp"
      ],
      "models": [
        "img/pieces/merelani/m1.webp"
      ],
      "storyUrl": "/high-jewellery/merelani/",
      "storyLabel": "Explore Rosette",
      "card": "img/merelani-set.webp"
    },
    {
      "id": "helix",
      "name": "Helix",
      "materials": "9.16ct Tanzanite and Diamond",
      "type": "Necklaces",
      "collection": "Heritage",
      "occasion": "Gifting",
      "carat": "9.16ct",
      "origin": "—",
      "metal": "18k White Gold",
      "ref": "—",
      "story": "",
      "gallery": [
        "img/pieces/helix/p1.webp",
        "img/pieces/helix/p2.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/helix/",
      "storyLabel": "Explore Helix"
    },
    {
      "id": "rihla",
      "name": "Rihla",
      "materials": "11.83ct Tanzanite, 48.92ct Mother-of-Pearl and Diamond",
      "type": "Necklaces",
      "collection": "Nocturne",
      "occasion": "Gala",
      "carat": "11.83ct tanzanite · 48.92ct mother-of-pearl (necklace)",
      "origin": "—",
      "metal": "14k White Gold",
      "ref": "GD26-11 · GD26-12",
      "story": "",
      "gallery": [
        "img/pieces/rihla/p1.webp",
        "img/pieces/rihla/p2.webp",
        "img/pieces/rihla/p3.webp",
        "img/pieces/rihla/p4.webp",
        "img/pieces/rihla/p5.webp"
      ],
      "models": [
        "img/pieces/rihla/m1.webp",
        "img/pieces/rihla/m2.webp",
        "img/pieces/rihla/m3.webp",
        "img/pieces/rihla/m4.webp",
        "img/pieces/rihla/m5.webp"
      ],
      "storyUrl": "/high-jewellery/rihla/",
      "storyLabel": "Explore Rihla",
      "card": "img/rihla-set.webp"
    },
    {
      "id": "serengeti",
      "name": "Wimbi",
      "materials": "21.86ct Rhodolite and Diamond",
      "type": "Necklaces",
      "collection": "Tanzania Universe",
      "occasion": "Collector",
      "carat": "21.86ct",
      "origin": "Merelani, Tanzania",
      "metal": "—",
      "ref": "—",
      "story": "",
      "visualiser": {
        "color": "#1a4588",
        "accent": "#553a9a",
        "ior": 1.7,
        "cut": "oval",
        "cutLabel": "Oval cut",
        "attenuation": 0.48
      },
      "gallery": [
        "img/pieces/serengeti/p1.webp",
        "img/pieces/serengeti/p2.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/serengeti/",
      "storyLabel": "Explore Wimbi"
    },
    {
      "id": "rift",
      "name": "The Queen of Green",
      "materials": "Tsavorite and Diamond",
      "type": "Necklaces",
      "collection": "Tanzania Universe",
      "occasion": "Gala",
      "carat": "—",
      "origin": "—",
      "metal": "—",
      "ref": "GD25-401 · GD25-401 A",
      "story": "",
      "gallery": [
        "img/pieces/rift/p1.webp",
        "img/pieces/rift/p2.webp",
        "img/pieces/rift/p3.webp",
        "img/pieces/rift/p4.webp",
        "img/pieces/rift/p5.webp",
        "img/pieces/rift/p6.webp"
      ],
      "models": [
        "img/pieces/rift/m1.webp",
        "img/pieces/rift/m2.webp",
        "img/pieces/rift/m3.webp",
        "img/pieces/rift/m4.webp",
        "img/pieces/rift/m5.webp",
        "img/pieces/rift/m6.webp"
      ],
      "storyUrl": "/high-jewellery/rift/",
      "storyLabel": "Explore The Queen of Green",
      "card": "img/rift-set.webp"
    },
    {
      "id": "mahenge",
      "name": "Samaah",
      "materials": "16.05ct Pink Tourmaline and Diamond",
      "type": "Necklaces",
      "collection": "Origin",
      "occasion": "Collector",
      "carat": "16.05ct pink tourmaline · 32.10ct diamond",
      "origin": "—",
      "metal": "—",
      "ref": "—",
      "story": "",
      "visualiser": {
        "color": "#c45a7a",
        "accent": "#e8a0b4",
        "ior": 1.72,
        "cut": "cushion",
        "cutLabel": "Cushion cut",
        "attenuation": 0.52
      },
      "gallery": [
        "img/pieces/mahenge/p1.webp",
        "img/pieces/mahenge/p2.webp",
        "img/pieces/mahenge/p3.webp",
        "img/pieces/mahenge/p4.webp",
        "img/pieces/mahenge/p5.webp"
      ],
      "models": [
        "img/pieces/mahenge/m1.webp",
        "img/pieces/mahenge/m2.webp",
        "img/pieces/mahenge/m3.webp",
        "img/pieces/mahenge/m4.webp",
        "img/pieces/mahenge/m5.webp"
      ],
      "storyUrl": "/high-jewellery/mahenge/",
      "storyLabel": "Explore Samaah",
      "card": "img/mahenge-set.webp"
    },
    {
      "id": "oldoinyo",
      "name": "Mediterranea",
      "materials": "82.32ct Pink Spinel and Diamond",
      "type": "Necklaces",
      "collection": "Heritage",
      "occasion": "Bridal",
      "carat": "82.32ct pink spinel (necklace) · 9.84ct (earrings)",
      "origin": "—",
      "metal": "18k Rose Gold",
      "ref": "GD23-442 · GD23-442 A",
      "story": "",
      "gallery": [
        "img/pieces/oldoinyo/p1.webp",
        "img/pieces/oldoinyo/p2.webp",
        "img/pieces/oldoinyo/p3.webp",
        "img/pieces/oldoinyo/p4.webp"
      ],
      "models": [],
      "storyUrl": "/high-jewellery/oldoinyo/",
      "storyLabel": "Explore Mediterranea",
      "card": "img/oldoinyo-set.webp"
    }
  ],
  "focal": {
    "img/pieces/celestine/m1.webp": 46,
    "img/pieces/celestine/m2.webp": 52,
    "img/pieces/celestine/m3.webp": 51,
    "img/pieces/celestine/m4.webp": 80,
    "img/pieces/celestine/m5.webp": 89,
    "img/pieces/celestine/m6.webp": 20,
    "img/pieces/celestine/m7.webp": 70,
    "img/pieces/celestine/m8.webp": 86,
    "img/pieces/celestine/m9.webp": 71,
    "img/pieces/celestine/p3.webp": 100,
    "img/pieces/celestine/p7.webp": 19,
    "img/pieces/ember/m1.webp": 56,
    "img/pieces/ember/m2.webp": 48,
    "img/pieces/ember/m3.webp": 100,
    "img/pieces/ember/p3.webp": 100,
    "img/pieces/ember/p5.webp": 59,
    "img/pieces/georgie/p2.webp": 100,
    "img/pieces/hive/p1.webp": 0,
    "img/pieces/jardin-bleu/m1.webp": 100,
    "img/pieces/jardin-bleu/m2.webp": 100,
    "img/pieces/jardin-bleu/m3.webp": 76,
    "img/pieces/jardin-bleu/m4.webp": 71,
    "img/pieces/jardin-bleu/p2.webp": 71,
    "img/pieces/jardin-bleu/p5.webp": 100,
    "img/pieces/mahenge/m1.webp": 63,
    "img/pieces/mahenge/m2.webp": 0,
    "img/pieces/mahenge/m3.webp": 81,
    "img/pieces/mahenge/m4.webp": 73,
    "img/pieces/mahenge/m5.webp": 84,
    "img/pieces/mahenge/p3.webp": 63,
    "img/pieces/mahenge/p5.webp": 81,
    "img/pieces/merelani/m1.webp": 16,
    "img/pieces/merelani/p4.webp": 16,
    "img/pieces/oldoinyo/p2.webp": 79,
    "img/pieces/oldoinyo/p4.webp": 79,
    "img/pieces/rift/m1.webp": 96,
    "img/pieces/rift/m2.webp": 100,
    "img/pieces/rift/m3.webp": 69,
    "img/pieces/rift/m4.webp": 73,
    "img/pieces/rift/m5.webp": 62,
    "img/pieces/rift/m6.webp": 31,
    "img/pieces/rift/p3.webp": 66,
    "img/pieces/rift/p6.webp": 100,
    "img/pieces/rihla/m1.webp": 0,
    "img/pieces/rihla/m2.webp": 59,
    "img/pieces/rihla/m3.webp": 37,
    "img/pieces/rihla/m4.webp": 46,
    "img/pieces/rihla/m5.webp": 93,
    "img/pieces/rihla/p2.webp": 0,
    "img/pieces/rihla/p5.webp": 10,
    "img/pieces/serengeti/p2.webp": 18,
    "img/pieces/shamsa/m1.webp": 61,
    "img/pieces/shamsa/m2.webp": 0,
    "img/pieces/shamsa/m3.webp": 23,
    "img/pieces/shamsa/m4.webp": 72,
    "img/pieces/shamsa/m5.webp": 74,
    "img/pieces/shamsa/m6.webp": 43,
    "img/pieces/shamsa/p3.webp": 64,
    "img/pieces/shamsa/p5.webp": 23,
    "img/pieces/weaver/m1.webp": 65,
    "img/pieces/weaver/m2.webp": 16,
    "img/pieces/weaver/m3.webp": 49,
    "img/pieces/weaver/m4.webp": 0,
    "img/pieces/weaver/m5.webp": 100,
    "img/pieces/weaver/m6.webp": 100,
    "img/pieces/weaver/m7.webp": 100,
    "img/pieces/weaver/m8.webp": 83,
    "img/pieces/weaver/p2.webp": 100,
    "img/pieces/weaver/p4.webp": 0
  }
};
