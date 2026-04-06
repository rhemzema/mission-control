# Artemis II Mission Control

A real-time mission control dashboard for NASA's Artemis II crewed lunar mission (launched April 1, 2026). Built in React, designed for desktop, tablet, and mobile — including full landscape phone support.

---

## What It Does

Combines live video feeds, a mission countdown, a scrollable arc-based timeline of all 28 mission maneuvers, KSC weather, live NASA blog updates, and crew information in a single dark-themed interface modelled after a mission control display.

---

## Features

### Live Streams
- Embeds multiple YouTube streams simultaneously (default: NASA Orion feed + NASA Live)
- **Four layout modes**: Gallery (2-col), Focused (2/3 main + 1/3 sidebar stack), Triple (3-col), Cinema (main top + thumbnails below)
- Add any YouTube URL or embed link as a custom stream
- Drag-to-reorder streams on desktop; tap to feature/collapse on mobile
- Per-stream mute toggle; global refresh button reloads all iframes

### Mission Countdown (T-0)
- Counts down to liftoff (April 1, 6:35 PM EDT), then counts up as elapsed mission time
- **Freezes at splashdown** — displays final mission duration once the mission ends
- Click the display to adjust T-0 (useful for scrubbing the timeline during replays)
- Hold/resume button pauses the counter
- Next milestone indicator shows the upcoming event name and time-to-go

### Mission Timeline
- **28 milestones** covering the full mission: ascent, Earth orbit maneuvers, TLI, outbound corrections, lunar flyby, return burns, reentry, and splashdown
- Sourced from NASA official publications and confirmed live coverage
- `confirmed: true` = already executed; `confirmed: false` = planned/estimated (shown with `~` prefix and hollow dot)
- Rendered as an **interactive arc** — nodes sit on a parabolic curve; the arc is fixed, nodes glide along it as you scroll
- Drag (touch/mouse) or trackpad horizontal scroll to navigate; **snaps** to the nearest milestone on release with spring easing
- Opens centred on the next upcoming milestone
- Animates smoothly between positions using a separate interpolated display offset

### KSC Weather
- Live data from Open-Meteo API (Kennedy Space Center, Pad 39B coordinates)
- Displays temperature, wind speed, gusts, cloud cover, precipitation
- Colour-coded GO / WARNING / NO-GO indicators per parameter
- Auto-refreshes every 5 minutes

### NASA Blog Feed
- Polls the NASA Artemis blog RSS feed every 5 minutes via rss2json + fallback CORS proxies
- Shows latest headlines and summaries with timestamps
- Collapsible; refresh button for on-demand updates

### Crew
- Reid Wiseman (Commander), Victor Glover (Pilot), Christina Koch (Mission Specialist), Jeremy Hansen (Mission Specialist, CSA)

---

## Responsive Design

| Breakpoint | Behaviour |
|---|---|
| Desktop (>768px) | Full sidebar with timeline, weather, crew, feed; multi-column stream grid; drag-to-reorder |
| Tablet (768–1000px) | Same as desktop; layout button labels collapse to icons only |
| Portrait mobile (≤767px) | Vertical stream stack; bottom iOS-style tab bar (Reload / Add / Feed count / Details); info sheet slides up |
| Landscape mobile | Compact 44px header with centred UTC/ET clock; icon-only layout switcher in controls bar; 2-column stream grid respecting selected layout; info button in header |

---

## Tech Stack

- **React 18** (hooks only, no class components)
- **Vite** build tooling
- **DM Sans + DM Mono** (Google Fonts) for typography
- **Material Symbols Outlined** for icons
- **SVG** for the mission timeline arc (pure computed geometry, no canvas)
- **Open-Meteo API** for weather (no API key required)
- **rss2json + CORS proxies** for NASA blog feed
- No state management library; no UI component library

---

## File Structure

```
src/
├── App.jsx        # All components and logic (~1700 lines)
└── App.css        # All styles — desktop base + mobile/landscape media queries
```

The entire app is intentionally two files. Desktop and tablet styles are defined in the base CSS; mobile overrides are isolated in `@media (max-width: 767px)`; landscape phone overrides use `@media (max-height: 500px) and (orientation: landscape)`.

---

## Mission Data Sources

All milestone times are sourced and cited:

| Data | Source |
|---|---|
| Liftoff, ascent MET times | NASA Artemis II launch day blog |
| Orbit burns (PRM, ARB, Prox Ops) | NASA flight update blog posts |
| TLI time | The Planetary Society live coverage (confirmed) |
| Outbound/return TCMs | NASA daily agenda (Days 3–5, 7–9); times estimated mid-day |
| Distance record | NASA coverage schedule (April 6, 1:45 PM EDT) |
| Splashdown | NASA public schedule (April 10, 8:06 PM EDT) |

Unconfirmed future milestones are flagged with `confirmed: false` and rendered with hollow dots and a `~` time prefix.

---

## Stream Persistence

Added streams are saved to `localStorage` and restored on next load. The Reset Feeds button clears back to the two default NASA streams.

---

## Known Limitations

- YouTube embeds require the user's browser to allow third-party cookies for autoplay to work correctly
- The NASA RSS feed relies on third-party CORS proxy services; if all proxies are unavailable the feed section shows "no feed" and retries automatically
- Milestone times for TCM burns (outbound and return) are estimated based on the daily schedule pattern — NASA has not published exact times for these maneuvers

---

*Built during the Artemis II mission, April 2026.*
