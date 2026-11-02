# TKL Debt Machine — landing page

A single static landing page built from Figma, styled with **plain CSS** (no
Tailwind, no build step) and served by a zero-dependency Node server. The page
is meant to be pasted into Ontraport later, so the CSS is written for a human
to edit by hand.

Styling: vanilla CSS. (The np-figma skills read this mode from the absence of
`tailwind.config.js`.)

Wrapper: .cc

Change it only with `python3 ~/.claude/skills/np-figma-build/scripts/set_wrapper.py <name|none>`,
which rewrites the CSS, the HTML and this line together.

## Source of truth

The page is a translation of this Figma file:

    https://www.figma.com/design/GaOhwkLFNAEjyCIHInp0Tk/TKL-Debt-Machine?node-id=4-5092

Work from the design, not from memory. Pull each frame with the Figma MCP
tools (`get_design_context` / `get_metadata` / `get_screenshot`) and match the
values it reports.

## Layout

    index.html       the whole page — one file, inside the wrapper div if there is one
    css/styles.css   the only stylesheet, hand-written, loaded directly
    assets/          images and SVGs exported from Figma
    server.js        static file server; binds $PORT for the host
    zip.js           zero-dependency zip writer behind /download
    live-reload.js   dev-only live reload behind `npm run dev`
    package.json     start script only

## Commands

    npm start        # serve on $PORT (default 8080)
    npm run dev      # same, plus live reload on every save

There is no build. Edit `css/styles.css`, reload, and bump `?v=` on the
stylesheet link when browsers may hold the old file.

## Conventions

**One commented block per Figma frame, in document order.** Every section of
the page opens with a banner comment naming the section and the node id it came
from, and its CSS block under Sections in `css/styles.css` opens with
`/* The Cramer Signal · node 11:2755 */`:

```html
<!-- ================================================================
     SECTION · The Cramer Signal  ·  node 11:2755
     ================================================================ -->
```

**The wrapper.** With a wrapper (the `Wrapper:` line above), the page lives
inside `<div class="<wrapper>">` and every selector starts with it, which keeps
Ontraport's own CSS and ours apart. With `Wrapper: none`, selectors are plain
and page-wide rules sit on `:root`. The examples below are written with `.lp`;
drop or swap it to match.

**Style by element and context, not per element.** Repeated things get one
rule: `.lp p` sets the body copy once, `.lp .header p` changes it for the
header only, `.lp .speaker` is a tag used forty times. A section's block holds
only what makes that section different. Never `style=""`, never `!important`
(outside the reduced-motion rule), never `#id` selectors.

**Readable class names.** A section's root carries its kind and its slug:
`<section class="section cramer-signal">`. Children inside it are styled by
element (`.lp .cramer-signal p`) or by a short semantic class
(`.lp .cramer-signal .quote`). No utility-style names (`mt-4`, `text-lg`).

**Exact Figma values, through tokens.** Colours, font families and the column
width are custom properties under Tokens (`var(--ink)`). Sizes are the exact pixel
values from Figma.

**Mobile first, one breakpoint.** Base rules hold the mobile values; one
`@media (min-width: 768px)` right after them restores the Figma desktop values.
Widths are `max-width`, never a fixed `width` in px.

**Assets.** Export from Figma, save under `assets/` with a descriptive
lowercase-hyphen name, reference relatively (`assets/hero-bg.png`). Decorative
images get `alt=""` and `aria-hidden="true"`.

Formats are PNG and JPEG only (no WebP), optimised rather than shipped raw from
Figma. Opaque images are progressive JPEGs (photos q82, the background texture
q90 with 4:4:4 chroma). Transparent rasters stay PNG, quantised to 256 colours.
Cap each image at twice its largest display width.
Animated charts are the designer's GIFs, used as delivered inside `.chart`.

**Comments are labels, not explanations.** Each section has its banner (name
and node id) in the HTML and a one-line `/* Name · node X:Y */` in the CSS;
group headings (Tokens, Reset, Base, Layout, Components, Sections, Motion) and a
short component name where the class doesn't say it. Nothing else. Deliberate
deviations from Figma are listed in the build report, not in the code.

**Accessibility.** Semantic landmarks (`header`, `section`, `footer`), one
`h1`, headings that descend in order, `aria-hidden="true"` on decorative
separators and duplicated marquee copy. `prefers-reduced-motion` is handled under
Motion in `css/styles.css`.

## This page

- 44 sections: top bar, masthead, 38 speaker turns (`section turn`), the "what you get"
  panel, the offer (`#order`), the FAQ and the footer. Figma's story frames are split into
  turns at speaker changes; a turn's banner names the first node of its range. Full-width
  `.divider` lines sit under the masthead and between stories 1 and 2.
- Fonts: JetBrains Mono 400/700/800 (+ 800 italic) everywhere, Manrope 800 on the CTA
  button, Inter 400 in the footer only.
- Shared pieces live under Components: `.speaker` (+ `--robert/--garrett/--chris`),
  `.rule` / `.rule--short`, `.divider`, `.quote` (+ `--testimonial`), `.button` (the blue CTA),
  `.heavy` (an 800 run), `.chart` (black frame for an animated GIF chart), and `mark` for the lime highlight.
- One uniform 25px block rhythm in the story column (Figma varies per story).
- `assets/texture.jpg` is the one dark texture (masthead image aside); `.dark` applies it.
- Build notes, the manifest and the Figma sync baseline are in `build/` (gitignored).

## Moving it to Ontraport

Paste the page markup (the wrapper div and everything in it) into a custom HTML block, and
`css/styles.css` into the page's custom CSS. Upload `assets/` to Ontraport's
file manager (or keep the Railway URLs) and update the image paths.

## Deploy

The host (Railway) auto-detects Node from `package.json` and runs `npm start`.
`server.js` must keep binding `0.0.0.0` and `process.env.PORT`.

**Download zip.** Every deploy also serves the finished site as one archive at
`/download` (alias `/download.zip`). It holds `index.html`, `css/` and
`assets/`, with HTML comments stripped. Nothing on the page links to it.
