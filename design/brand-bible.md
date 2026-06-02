# Checkpoint K — Brand Bible

**Status:** Draft 2 — palette + mood locked from the CK logo
(2026-05-31). Voice, tone, and visual rules are working drafts; refine
through use.

This document is the rulebook for what Checkpoint K **feels like** —
visually, verbally, and emotionally. Goes hand-in-hand with `STORYLINE.md`
(the lore) and the design tokens in `design/tokens/`.

---

## 1. The feeling

CK is **a frozen apocalypse**. The world has gone cold — not just the
weather, but the bones of civilization. Energy crackles in the air like
arc-flash through fog. Pure black night with veins of electric cyan
splitting it open. The Refuge's lamp glow is the only warm thing for a
hundred miles.

The brand should feel:

- **Cold and electric, not earthy.** Ice, ozone, voltage, deep ocean.
  Not rust, leaves, mud.
- **High contrast, not muted.** Pure black backgrounds with sharp cyan
  energy. The world is dark, but the things in it are *vivid*.
- **Otherworldly, not mundane.** The CK monogram looks like a rune
  struck by lightning — there's something *not normal* about this place.
- **Sharp, not soft.** Angular shapes, jagged ink-splatter, sharp
  serifs. The world has cut edges.
- **Quiet, not loud.** The audio palette is restrained. Wind through
  steel, distant arc-flash crackle, static, silence between heartbeats.

**Reference touchstones:**
- **The CK logo itself** — sharp cyan monogram against black, energy
  bursting outward, ink-splatter ring. This is the visual DNA.
- *Annihilation* (film) — cyan/teal palette, otherworldly cold, beautiful
  threat
- *The Thing* (Carpenter) — black night, isolation, cold as adversary
- *Death Stranding* — pure black with stark electric highlights
- *Hardspace: Shipbreaker* — cold space-industrial UI
- *Inscryption* (Act 1) — dark, sharp, occult-tech
- *Cyberpunk 2077 net runs* — pure black + arc cyan UI elements
- *The Road* (McCarthy) — tone, not look. The world is over.

**The thing I want to feel when I open the launcher:** like I've just
tuned a long-wave radio to a frequency I shouldn't be on, and something
on the other end is *aware of me*. Cold. Quiet. Crackling. Real.

---

## 2. The voice

How CK talks to players:

- **First-person plural where possible.** "We've lost contact with the
  eastern coast." Not "the eastern coast is unavailable."
- **Sparse, declarative.** "Marko is at the Refuge. Iva needs you."
  Not "Hi! Marko is currently at the Refuge and Iva is requesting
  your assistance!"
- **In-fiction even for technical things.** "Radio signal lost." Not
  "Connection to server failed."
- **No corporate cheerfulness.** No "Hooray!", "Awesome!", "Welcome
  back, [Name]!". The world has lost ten years; it's not happy to see
  anyone.
- **British/European, not American.** Spelling, idiom, register.
  Honour, colour, organisation. The cluster is Northern Europe; the
  voice matches.

**Examples:**
- ❌ "Welcome back! Ready to continue your adventure?"
- ✅ "Marko, last seen at Arland Refuge. Stepan reports the An-2 is
  fuelled and waiting."

- ❌ "Connection failed. Please try again."
- ✅ "No signal from Chernarus relay. Last contact 3 minutes ago."

- ❌ "Premium subscription unlocks 4 extra character slots!"
- ✅ "Refuge Sponsor status — papers signed, extra bunks reserved.
  Two additional characters."

---

## 3. The visual rules

### Color
Locked from the logo. Use semantic tokens (`design/tokens/colors.json`),
not raw values. Key principles:

- **Pure black is the base.** Not grey. Not very dark blue. Black.
  Surfaces raise to deep void tones, never lighten to grey.
- **Cyan/frost is the primary brand.** Headings, accents, active states,
  links — all use frost tones.
- **Warmth is sacred and rare.** Ember (lamp glow) appears only on
  Arland's accent (the Refuge), in Settings → "Light a lamp" mode,
  on critical narrative beats. **Never on buttons.** Never as a base
  surface. Warmth is *something we lost*.
- **Blood red is for catastrophe only.** DBNO state, hostile contact
  alerts, failed transfer with data loss. If everything is red, nothing
  is.

**Region colors** — each map's accent informs UI when the player is
there:
- **Arland — ember** (`#D89A2E`). The Refuge. Lamp-lit, warm, the last
  human-feeling place. Contrasts against the cold base, which is the
  whole point.
- **Everon — frost mid** (`#5FA0BC`). The mainland. Cold but inhabited,
  electric infrastructure half-working.
- **Kolguyev — arc** (`#4FCFDF`). The frozen frontier. The same color
  as the logo's electric energy — Kolguyev is where CK's atmospheric
  identity lives most purely.

### Typography
- **Display = angular, broken, occult-tech.** Look at the K in the
  logo — sharp serifs, jagged terminals, runic feel. Source candidates:
  *Bromsmark*, *Cinzel*, *Spectral SC*, *Bahnschrift Condensed* (for a
  free option), or commission custom. Heavy weight, all caps, wide
  tracking for signage feel.
- **Body = humanist sans, high legibility.** Whatever holds up at small
  sizes against dark backgrounds. *Inter*, *IBM Plex Sans*, *Geist*.
  Regular weight; semibold for emphasis.
- **Mono = technical, narrow.** *JetBrains Mono*, *Geist Mono*, *Cascadia
  Code*. For coords, log lines, radio frequencies, system readouts.

**Caps + wide tracking for `label` scale only.** Caps = signage,
warning, designation. Not used for body copy.

### Iconography
- **Line style** by default, 1.5px stroke at 24px viewbox
- **Filled style** for "active" or "selected" states only
- **Sharp corners, not rounded.** Match the logo's geometry.
- Match the CK monogram's angular DNA — slight asymmetry, broken
  terminals, occult-rune feel where it fits (faction sigils especially)
- No mixed styles in the same screen

### Imagery
- **Photography:** high-grain, very low saturation, cold color cast
  (slight cyan push), lots of weather. Almost monochrome with selective
  cyan/ember highlights.
- **Illustration:** brush-painted or ink-and-water, similar splatter
  aesthetic to the logo. NPC portraits should feel like archived field
  photos — high contrast, cold light.
- **Backgrounds:** drone-style flyovers of the regions, color-graded
  toward cyan/black. Long static holds. No fast cuts.
- **No flat illustration. No clip-art. No stock photos of "happy gamers."**
- **No emoji.** Anywhere. Ever.

### Composition
- **Pure black backdrops** — let the void be the negative space
- **Off-center compositions** — the monogram on the cover image is
  off-center inside its energy ring; UI should echo that, leaning
  asymmetric
- **Generous negative space** — the world is empty. The UI should
  breathe.
- **Slight misalignment is fine** — a few pixels can read as "real" and
  "hand-cut," not "broken." Use sparingly and intentionally.

### The logo itself
- **Always on pure black.** Never on a coloured or photo background
  without a black scrim.
- **Never recolored.** The frost-cyan + black is the logo. Don't tint it.
- **Minimum clear space** = the width of the K's vertical stroke on all
  sides
- **Minimum size** = 48px (digital) / 12mm (print) — below this the ink
  splatter loses detail and it becomes a smudge
- **The energy ring is part of the logo.** Don't crop it tight to the
  monogram unless you're working in a constrained space (favicon, app
  icon at 16/32px) where a "tight" simplified version is needed — keep
  that variant separate and reuse it consistently.

---

## 4. The audio rules

- **UI sounds**: short, dry, mechanical, slightly electric. Click should
  sound like a relay switch in a cold room, not a chime. Hover should
  be a tick, almost subliminal.
- **Ambient**: filtered (bass-heavy, no melody), seamless loops, very
  quiet. Wind through steel cables. Generator hum. Distant arc-flash
  crackle. Faint long-wave static.
- **Voice fragments**: NPCs are tired, regional, real. ElevenLabs Pro
  voice direction documented in `STORYLINE.md` Part 5.
- **Music**: minimal. The world doesn't have a soundtrack. Use music
  only for loading screens (cold drones, long sustained tones), death,
  and major story beats. Reference: Hildur Guðnadóttir's *Chernobyl*
  score — sound design as music, not melody.

---

## 5. What we don't do

A short list of things that would betray the brand:

- Big primary CTAs with bouncy animations
- Stock illustrations of people smiling
- Emoji or playful exclamation marks
- "Gamified" XP bars with glowing particles
- Default Bootstrap / Material / Tailwind looks
- Comic-sans-style or rounded "friendly" typography
- Mid-2010s gradient buttons
- Marketing speak ("Unleash your", "Discover", "Adventure awaits")
- "Welcome back!" greetings
- Confetti animations for any reason ever
- Warm color backgrounds on the launcher — warmth is rare and earned
- Light mode. The world is dark; there is no light mode.

---

## 6. When you're not sure

Default to **darker, quieter, sharper, more practical.** When in doubt,
remove a thing rather than add one. The world is broken and cold —
let the UI reflect that.

If you're tempted to add a flourish, ask: *would Stepan put this in his
field log?* If no, don't.

---

## 7. Living document

Update this file whenever a design decision is made that should apply
project-wide. Date each change at the top. The freelance designer
sprint in Phase 0 refines and locks the remaining open items:
- Final display font (license or commission)
- Final body + mono font pair
- Initial icon set (~30 icons)
- Two NPC portraits as style templates
- Logo variants (tight/simplified, monochrome, dark/light backgrounds)
