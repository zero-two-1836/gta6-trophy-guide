# Leonida Trophy Guide — GTA VI: all 55 trophies, offline tracker

An offline web app that guides and tracks all 55 PlayStation 5 trophies of
Grand Theft Auto VI. Static files only: serve `app/` (`node serve.ts`, then
open http://localhost:8080) or just open `app/index.html` from a static
server — it runs with the network off, from its own files.

## What it does

- **The official list, all 55** — every trophy with its official name,
  description and grade (1 Platinum, 2 Gold, 6 Silver, 46 Bronze; 28 hidden),
  in `app/data/trophies.json`, cross-checked against the kit starter's list.
- **Checklist tracker** — tick a trophy when it pops; progress saves in the
  browser (localStorage) with a progress bar and per-grade counts. Export
  progress as JSON and import it back. Reset clears it.
- **Detail pane** — click any trophy to open its guide beside the list: the
  official description, the guide in this entry's own words, its sources as
  links, its count target where PSN tracks one, and a per-trophy notes box
  that saves in the browser.
- **Filters** — by kind (Story, Side stories, Activities, Collectibles,
  Robberies, Combat, Money & property, Exploration, Odd jobs & secrets,
  Platinum & 100%), by grade, by earned/remaining, missable-only, and
  free-text search.
- **Spoiler setting** — story trophies stay masked ("Hidden trophy — story
  spoiler") until you earn them or switch "Show story spoilers" on. Earned
  story trophies unmask themselves.
- **Roadmap to the Platinum** — about 200 hours in one playthrough, in three
  stages, each with a live progress bar showing how many of that stage's
  trophies you have earned. Includes the full 100% completion breakdown
  (for A Long Road) and the one possibly missable trophy flagged.
- **Next up planner** — the progress card always names the next trophy to
  chase, in roadmap order, with a button that opens its guide.
- **Missable trophies flagged** — Positive Mental Attitude is the only trophy
  that might be missable (Lucia's Chapter 1 balcony meditation), flagged on
  the trophy, in the detail pane, and in a warning box on the roadmap.
- **A guide to each trophy, in our own words, with its sources** — what to
  do, where, how, and when it can be missed. Each guide names its sources
  beside it. Five hidden trophies have no confirmed unlock method at launch
  (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out
  There, Ten Pin); their guides say so plainly instead of guessing. Two more
  (Strangers & Freaks, Fair Game) are marked partly unconfirmed.

## Verification (19 Nov 2026)

Names, descriptions and grades were cross-checked against the kit starter's
own 55-entry list (identical on all 55) and the published lists that agree
on all 55:

- GTABase — GTA 6 Trophy Guide & Achievements List:
  https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series
- Output Lag — GTA 6 Trophy List: All 55 Trophies and Achievements:
  https://outputlag.com/guides/gta-6-trophy-list/
- PowerPyx — GTA 6 Trophy Guide & Roadmap (missable + 100% details):
  https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/
- KeenGamer — GTA 6 Trophy Guide & Platinum Roadmap:
  https://www.keengamer.com/articles/guides/gta-6-trophy-guide-platinum-roadmap-all-55-trophies/
- Exophase — the official list's names, descriptions and grades:
  https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/
- PSNProfiles — grades and PSN progress targets:
  https://psnprofiles.com/trophies/43531-grand-theft-auto-vi

Headless checks (Playwright + bundled Chromium, app served on localhost):
55 rows render; ticking a trophy persists across reload; spoiler masking
hides 12 story rows until earned or switched on; silver filter shows 6;
search "bank" shows 4; missable-only shows 1; a per-trophy note persists;
export downloads gta6-trophy-progress.json; demo mode seeds 13 of 55;
zero off-origin requests. Screenshots are real renders of this app.

## Run it

```
node serve.ts            # http://localhost:8080
```

To hand the entry in (writes dossier.json):

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What changed vs the first (pre-opening) build

The first build (agent 445600d7, session started 16:35 WIB, before the
18:00 WIB opening) is invalid and was never submitted. This build was
written fresh in a new session that started after the opening, and improves
on it in these ways:

- **Two-pane layout**: a sticky detail pane beside the checklist shows the
  selected trophy's full guide, sources and notes — the old build showed
  guides inline in the list only.
- **Per-stage roadmap progress**: each of the three roadmap stages has a
  live progress bar (trophies earned in that stage), not just a static list
  of steps.
- **Next-up planner**: the progress card names the next trophy to chase in
  roadmap order, with a button that opens its guide.
- **Per-trophy notes**: a notes box in the detail pane, saved in
  localStorage alongside progress.
- **Count chips**: trophies with a PSN-tracked count show it on the row
  ("250 stunts", "42 Shooting Range challenges", "100 locations", …).
- **Light paper look**: a new light theme (the old build was dark), with a
  serif display face and one coral accent.
- **Guides rewritten**: every guide was written fresh in this session, in
  this entry's own words, with per-trophy source links rendered in the
  detail pane.
- **Honesty flags kept and made visible**: the 5 unconfirmed secret
  trophies and 2 partly unconfirmed ones carry visible pills on their rows
  and in the detail pane.
## Files

- `main.ts` — entry program: copies app/ + screenshots/ to /output and
  writes dossier.json with vendor/makefun-frontend.ts.
- `serve.ts` — tiny static server for local testing.
- `app/index.html`, `app/style.css`, `app/app.js` — the guide.
- `app/data/trophies.json` — all 55 trophies with official data and guides.
- `screenshots/` — 4 real renders (cover, guide open, roadmap, silver filter).
- `vendor/makefun-frontend.ts` — the kit's copy, unchanged.
- `shots.json` — which views the screenshots were taken of.
