# About integration checks

Run `node --test tests/about.test.cjs`. The preservation manifest pins shared component PR17 at 83dbfb4d8241501012c5ec22be49d79f28ccf6b7 and records this page's original copy, links, JSON-LD, application script/style hashes, and original video elements.

The inline About region replaces the fixed disclosure. Application scripts, styles, and control dimensions are unchanged. Page adaptation styles are confined to #trontAbout. The existing primary application surface is marked for the shared component's lightweight mode.

CraftMine, SMEAR, and two distinct session-stable picks appear. SMEAR is a poster. The other three preview videos autoplay muted only while visible; sources release when offscreen or hidden. Visible application surfaces, reduced motion, and Save-Data keep posters only. Poster/title links remain ordinary accessible links. No play overlays or status instructions are rendered.

Browser release checks cover original control/canvas dimensions, application interaction, real posters and simultaneous playback, offscreen/hidden release, lightweight mode, stable selection, responsive layout, reduced motion, Save-Data, and touch links. Spheres also keeps its autoplay demo, VibeBeats keeps its audio running, and Text2PDF exports only editor content.
