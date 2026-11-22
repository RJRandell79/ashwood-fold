# Ashwood Fold: art bible

How the valley should look, and how to tell whether it does. This is the spec the 3D view is built and judged against. It covers the live valley (watercolour) and the book (engraving). The design doc holds the decisions; this file holds the detail. Change either one and keep them in step.

Decided 22 November 2026, after look tests of three styles on the same two villages (see `docs/art/looks_manor.jpg` and `docs/art/looks_mill.jpg`): **the valley is a watercolour, and the book is an engraving.**

## 1. Intent

The valley should look like a painting of a real place that someone cared enough to record. The player should want to linger over it, because lingering is when they notice things (a pegged-out plot, a shut mill, a field with a stranger's name) and want to know why. The look serves that curiosity. It doesn't compete with it.

So, in order of priority:

1. **Legible.** At phone width, from the default camera, you can tell a house from a barn from a church, a lane from a field, and where the river runs. Painterly never beats legible.
2. **Of its place.** It is the Ribble valley: wet western light, millstone grit, stone slate, thatch giving way to slate, woods in the cloughs and moor on the tops. Not a generic fantasy village.
3. **Of its age.** You can tell 1300 from 1790 at a glance, by material and colour, without reading a label.
4. **Calm.** A muted palette, with the strongest colour saved for things that matter: lamplight, a family's colours, a red-brick mill, the blue of the river.
5. **Cheap.** It runs on a mid-range phone. See section 11.

Not wanted: photorealism, cartoon saturation, heavy black outlines everywhere, visible tiling, or anything that looks like a filter laid over a game. It should look painted, not processed.

## 2. Two hands

| | The valley (live view) | The book (annals, archive, pictures) |
|---|---|---|
| Medium | Watercolour with a fine sepia pen | Copper or wood engraving: line and cross-hatching, sparse colour |
| Feels like | A topographical watercolour, or an estate surveyor's coloured plan | A plate in an 18th or 19th-century county history |
| When | Always, as you play | Still pictures made at a moment the annals record (phase 2) |

Both hands use the same paper colour and the same sepia ink, so a picture in the book plainly shows the place you've been watching.

## 3. Watercolour rules

**Paper.** Warm off-white (`paper`). It shows through every wash, and highlights are bare paper, never added white. Light grain over everything, as fine noise that doesn't move with the camera.

**Washes.**
- Colour sits in flat, slightly uneven washes, with a soft wobble at the edges, never a hard digital gradient.
- Two or three values per surface at most: lit, shade and shadow.
- Pigment gathers a little darker at a wash's edge, but never as a halo. The first look test had dark rings around every shadow, and that is the thing to avoid.

**Shadow.** Shadows are a transparent cool wash (`shadow`, ultramarine with a little violet) laid over the local colour, never grey or black. Cast shadows are soft-edged and slightly lighter at their far end.

**Distance.** Things fade towards the paper as they recede: less pigment, less contrast, no ink. The fells are a pale wash. The near village has the full palette and the pen.

**Ink.**
- A fine sepia pen (`ink`) on built things in the near and middle ground: rooflines, eaves, wall corners, doors and windows, bridges, walls and fences.
- The line breaks and varies a little in weight, as a hand would draw it.
- No ink on the ground, grass or water, except the river's banks as a broken line in the near ground.
- No ink on trees, except a few touches on near trunks.
- Ink fades out with distance. The second look test (`look-test-filter.js`, mode 1) is the starting point.

**Granulation.** A faint speckle in the darker washes, slate and shade especially. It sells the medium, but keep it subtle.

**Not allowed:**
- outlines on everything;
- sharp specular highlights;
- bloom or glow, except lamplight at dusk;
- lens effects or depth-of-field blur;
- pure black;
- pure white other than the paper;
- fully saturated greens.

## 4. Light and weather

The valley is in the west of England's wet side. The default is soft light with sun breaking through, not a hard noon sun.

- **Day:** the sun is low to middling, from the south-west, so cast shadows run north-east and are always visible. Lit sides are warm (a touch of yellow ochre in the light); shade is cool.
- **Morning and evening:** the warmth increases and shadows lengthen. The fells go blue.
- **Dusk:** the paper darkens towards a blue-grey wash, never to black, and the village must stay readable. Lamplit windows are the strongest colour in the picture (`lamp`), with a soft bloom allowed here alone. Smoke shows against the sky. The current dusk shot (`mill-dusk`) is far too dark.
- **Night:** as dusk, deeper, but you can still see the shapes of the houses and the line of the river.
- **Storm and snow:** washes go greyer and wetter, with a darker band along the top of the sky. Snow is bare paper with blue shade, not grey paint.

**Seasons** change the land's washes, not the buildings':

| | Grass | Woods | Fields |
|---|---|---|---|
| Spring | fresh green, yellow in it | light green, blossom as dabs of pink | ploughed brown, then a green haze |
| Summer | full green, slightly blue | deep green | green corn turning |
| Autumn | olive, browning | ochre and rust | stubble gold |
| Winter | grey-green, straw | bare brown-violet, holly stays dark | brown earth |

## 5. Palette

These are pigment colours on paper, as hex for the code. Each is the lit value. Shade is the same colour under the `shadow` wash; it is not a separate darker hex. Step 2 moves `src/data/styles.js` and the colours in `src/view/archetypes.js` onto these values.

| Token | Hex | Pigment it stands for | Used for |
|---|---|---|---|
| `paper` | `#F1EAD9` | the sheet | sky, highlights, snow, the book's page |
| `ink` | `#45362A` | sepia | pen lines, lettering |
| `ink-faint` | `#7A6652` | thinned sepia | distant lettering, traces |
| `shadow` | `#7D84A0` (~35%, multiplied) | ultramarine and violet | all shade and shadow |
| `grass` | `#A3B585` | sap green, yellow ochre | pasture, the green |
| `grass-far` | `#BCC4A8` | the same, thinned | distant ground |
| `wood` | `#6F8A5B` | sap green, burnt sienna | near woodland |
| `wood-far` | `#A3AE93` | thinned | far woodland |
| `moor` | `#9C8C7E` | burnt umber, violet | the tops, bracken, heather |
| `water` | `#8FAAB4` | cerulean, grey | river, canal |
| `water-deep` | `#6F8E9B` | indigo | deep pools, the far bank's shade |
| `lane` | `#CDB98E` | yellow ochre | lanes, the yard, worn ground |
| `field` | `#B9A06E` | raw sienna | ploughland, stubble |
| `thatch` | `#B8975F` | raw sienna, umber | thatch |
| `limewash` | `#E6DEC8` | the paper, barely tinted | limewashed walls |
| `grit` | `#CDBE9E` | yellow ochre, grey | millstone grit, sandstone |
| `timber` | `#5B4636` | burnt umber | framing, doors, posts |
| `flag` | `#8E8A7F` | grey, umber | stone-slate roofs, flags |
| `slate` | `#69727A` | Payne's grey | Welsh slate (railway age) |
| `brick` | `#B07058` | Venetian red, thinned | brick walls |
| `soot` | `#4E4842` | lamp black, umber | grime, chimney tops, the mill in its later years |
| `lamp` | `#E9B866` | Indian yellow | lit windows, the forge |
| `smoke` | `#A7A29A` | grey wash | smoke, steam |

**People and families:** a family's two heraldic colours, softened towards the paper by about 25%, so people read as small, clear dabs of colour. They are the only places strong colour appears in a crowd.

**Era drift:** the medieval village is warm and pale (`limewash`, `thatch`, `timber`). The industrial village is cooler and darker (`grit`, `flag`, then `slate`, `brick` and `soot`). A shot of each side by side should show the change before anyone reads a word.

## 6. Building and materials by age

Real Ribble valley building, as the 3D archetypes should draw it. Shape matters more than detail: read the roofline first, the walls second, the openings third.

**The manor village (1290–).**
- **Houses:**
  - long, low and timber-framed or crucked, with limewashed infill;
  - deep thatch with a soft, rounded ridge and eaves that come low;
  - small dark openings: no glass, just shutters and doors.
- **The hall, church and mill:** grit stone. The church has a squat tower; a spire is only for a later age. The hall and mill may have stone-slate roofs.
- **Barns:** big, dark roofs over low walls.
- **Land:**
  - the open fields as long strips (ridge and furrow);
  - hedges rather than walls on the low ground;
  - the green as one flat wash with the well, and the cross if there is one.

**The industrial village (1750–).**
- **Cottage years:** grit-stone cottages under thatch at first, then stone slate.
- **Mill and canal years:** two and three storeys, with long rows of small windows on the upper floor (weavers' lights). Stone-slate roofs, heavy and low-pitched.
- **Age of steam and railway age:**
  - brick in rows and slate roofs, with chimneys on every house;
  - the mill tall, with a square stack.
  - Soot builds up on mills and chimneys over the years (the existing grime, kept).
- **Land:**
  - drystone walls on the slopes and hedges in the bottom;
  - the canal straight and level, with a towpath;
  - the turnpike as a wider, paler lane.

**Wear** stays as it is now (moss, sag, holes in the roof), drawn as washes and broken lines, not textures.

**Ruins:** wall stubs with grass over them, no roof, the paper showing through. They should catch the eye as a question.

## 7. Land, water and trees

- **Terrain:** washes, not textures. The ground's shading comes from the light (lit slope warm, shaded slope cool), plus a faint value step at hard changes of slope. Hachures appear only in the map view (section 9).
- **The river:** a pale `water` wash, with a darker band along the shaded bank. A little bare paper glints in the near reach. It is never bright blue. Fords are paler. Bridges are inked.
- **Trees:** painted clumps, not low-poly cones and balls. Each tree is a few overlapping blobs of wash, darker underneath, with a little paper showing through. Each should read as oak, ash, alder (by water), thorn or holly by silhouette rather than detail. Woods are a mass with a broken edge, not a field of separate lollipops. Blossom is a few pink dabs, not pink trees.
- **Fields and walls:** fields as flat washes with a few dry-brush strokes for furrows or stubble. Walls and hedges are a darker line along the edge. Walls carry ink in the near ground; hedges never do.

## 8. People and animals

People are small and few-stroked: a body as one dab in the family's colours, a head as a dot of the skin wash, no outline. Groups read as a cluster of colour. The player finds a person by tapping, not by seeing their face; the portrait in the panel does that job. Animals, where there are any, are a few strokes in `timber`, `paper` or `grit`.

## 9. Lettering and the estate map

The white pill labels go. Names are lettered on the land in ink, as a surveyor or engraver would:

- **Buildings:** small upright roman capitals (IM Fell English SC, or IM Fell with letter spacing), in `ink`, sitting just above the roof with no background. A thin paper-coloured halo is allowed behind the letters, for legibility only.
- **Land, water and old names:** italic (IM Fell English italic), set along the thing named: a field name across the field, a river name along the river, a lane name along the lane. Old family names and traces use `ink-faint`.
- **Size:** lettering keeps one size on screen whatever the zoom, and shrinks or drops out in a set order (land names, then cottages, then the rest) as the camera pulls back. The current labels grow huge at close range (see `manor-close`), and that must not happen.

**The map view.** Straight down (the top-down camera), the valley becomes an estate map:
- hachures for slopes;
- field boundaries inked, with each field's name lettered across it;
- the river with a darker bank line;
- buildings as plan shapes with roofs washed in;
- a north arrow, a scale bar, and a cartouche in a corner naming the village and the year.

It should look like something the manor's steward or the canal company's surveyor drew.

## 10. The book's engraving (later)

For phase 2's pictures in the annals and the illustrated archive. Recorded here so the two hands are designed together.

- Line and cross-hatching in `ink` on `paper`, with tone from line density only, plus at most one soft tint wash.
- Built from the same 3D scene as the valley, frozen at the moment of the entry, with the second look test (`look-test-filter.js`, mode 2) as the start.
- Fewer elements than the live view: clear the clutter, keep the subject, and let the edges vignette into paper.
- Each plate gets a caption in IM Fell italic: what it shows, and the year.
- The look test showed engraving turns to grey noise on dense woodland and big villages, so plates are framed close, on one building or group.

## 11. Phones and performance

- The watercolour must hold 30 fps on a mid-range phone at the default camera, with the full village of an industrial age on screen.
- One full-screen post-processing pass plus a depth pre-pass at most. Noise is computed in the shader, with no texture lookups beyond the scene's colour and depth.
- A lighter mode on phones and low-power devices: no colour blur, ink on near things only, half-resolution grain.
- People who ask the system for reduced motion get no wobble animation. The wash wobble is static anyway; don't animate the paper.
- Dark theme: the page around the map follows the theme, but the painting itself stays on paper. Night comes from the game's clock, not the page theme.

## 12. Review shots

Six fixed frames, rendered by `node tools/review-shots.mjs`. The output lands in `review/current/`, which git ignores. Every change to how the valley looks is judged on these six, compared with the last accepted set. Don't move the cameras to make a change look better; if a shot needs to change, change it here and in the script together.

| Shot | Seed / years | Hour | What it tests |
|---|---|---|---|
| `manor-wide` | 9 / 10 (1299) | 10:30 | The manor village whole: era colour, legibility, washes on land |
| `manor-close` | 9 / 10 | 15:00 | The green and church close up: materials, people, ink at near range, lettering size |
| `manor-map` | 9 / 10 | 12:00 | Straight down: the estate-map reading |
| `mill-wide` | 6 / 90 (1790) | 10:30 | The mill village: two ages of building side by side, soot, slate and brick |
| `mill-dusk` | 6 / 90 | 19:30 | Dusk: lamplight, smoke, the shut mill still readable |
| `mill-map` | 6 / 90 | 12:00 | Straight down after the interlude: old names on the land, new streets |

## 13. Scoring

The visual critic answers these for each shot. It is a separate agent that sees only this file and the renders, never the code. Score each 0 (no), 1 (partly) or 2 (yes), and say what is wrong for anything under 2. A change is accepted when no shot scores lower than the last accepted set and the total rises.

1. **Legible:** can you tell what each building is, where the lanes run and where the river is?
2. **Painted:** does it look painted on paper rather than rendered, with no filter look, no halos and no tiling?
3. **Paper:** do the highlights and the sky come from bare paper, and does the grain show without being noisy?
4. **Shadow:** are shade and shadow a cool transparent wash, never grey or black?
5. **Ink:** is the pen on built things near to hand, fading with distance, and off the ground and trees?
6. **Distance:** does the far valley fade towards the paper?
7. **Of its age:** without reading a word, can you tell which age it is?
8. **Of its place:** does it look like a northern English valley: grit, slate, thatch, walls, wet light?
9. **Colour:** is strong colour kept for lamplight, families, brick and water, with everything else muted?
10. **Lettering:** are the names lettered on the land at a steady size, easy to read, and never covering the thing they name?
11. **Trees and land:** do the woods read as masses with character, and the fields as fields?
12. **Calm:** would you leave this on screen and look at it?

## 14. References to study

Period work to look at for the feel. These are names and kinds of work, not images to copy.

- **Topographical watercolour:**
  - Thomas Girtin and the young Turner, on their tours of the northern dales and abbeys (around 1795–1800);
  - John Sell Cotman, for flat, calm washes;
  - Peter De Wint, for wet northern fields.
- **Estate and enclosure maps** of 17th and 18th-century Lancashire and Yorkshire, hand-coloured, with cartouches; and the first edition Ordnance Survey six-inch maps (1840s), for hachures and lettering.
- **Engraved prospects and county histories:**
  - the Buck brothers' engraved prospects of northern towns and abbeys (1720s–40s);
  - Thomas Bewick's wood engravings, for small vignettes;
  - the engraved plates in Whitaker's history of the parish of Whalley (1801) and similar histories of the Ribble valley.
- **The look tests** in `docs/art/`: watercolour (A) is the starting point for the valley; the manor village in engraving (B) is the starting point for the book.

Reference images of Rob's choosing can be added under `docs/art/reference/`. Where one exists, it outranks the words here.
