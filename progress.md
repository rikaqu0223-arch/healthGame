Original prompt: Use Virus.glb under download to replace boss

## Progress

- Located `/Users/hequ/Downloads/Virus.glb` (42 KB).
- Inspected the GLB: it contains a large `Virus` mesh plus Blender camera, light, and cube objects.
- Plan: load only the largest/`Virus` mesh, normalize it to the existing boss scale, and retain the procedural boss as a loading/error fallback.
- Copied the asset to `public/models/Virus.glb`.
- Added asynchronous GLTF loading, normalization, material cloning, per-run tint/glow, hit flash, and animation support in `src/boss.js`.
- Production build passes.
- Changed the imported boss to a consistent fat-cell yellow/gold body and warm amber glow across all runs.
- Pulled and reapplied the work onto `f072cbf` (`Add meal scan starting health flow`) without conflicts; the combined build passes.
- Enhanced boss activation so all remaining level enemies and pickups are removed before boss animation, weapon checks, or collisions run on the activation frame.
- Added and verified `clearLevelObjects`: 3 test objects produced 3 scene removals and an empty active array.
- Production build and browser startup smoke test pass with no console errors.
- Added a meal-scan `SKIP` option that restores the default 100 starting health and opens the BioCurrent title screen without an upload or API request.
- Verified the skip flow in the browser: Meal Scan hides, the title screen activates, and no console errors are reported.
- Reframed the complete storyline around cardiovascular disease, arterial plaque, vessel narrowing, blockage removal, and restored circulation.
- Renamed all Pathogen bosses to Plaque Alpha through Plaque Omega and aligned the title, upgrade, HUD, ending, and README copy.
- Added a Supabase-backed top-10 leaderboard with a reusable title/result dialog, callsign persistence, score submission, loading/error/empty states, and responsive styling.
- Changed mission scoring to accumulate across all five artery runs so the saved final result represents the full mission.
- Added `supabase/migrations/202606280001_create_leaderboard_scores.sql` with read/insert-only RLS policies and documented the required dashboard setup.
- Added `window.render_game_to_text` for browser test state inspection; the production build passes.
- Added a required pilot callsign field before mission start; the name persists locally and prefills leaderboard submissions.
- Playwright verified empty-name validation, name persistence, intro-to-gameplay transition, movement/fire flow, mocked Supabase top-score reads and inserts, desktop result dialog, and mobile title/leaderboard layouts with no console errors.
- Live Supabase connectivity reaches the configured project; it currently returns the expected missing-table response until the migration is run.
- Added cumulative broccoli/veggie and fries/junk-food counters to leaderboard records.
- Added `meal-photos` Supabase Storage upload support; leaderboard rows store only `meal_photo_url` and display a thumbnail.
- Added a second migration for the new columns, public Storage bucket, file-size/type restrictions, and insert-only upload policy.
- Playwright verified both local-file upload and pasted-image import paths: each creates one Storage object, and the database payload contains only the resulting Supabase public URL plus both food counters.
- Moved hosted meal analysis behind a Cloudflare Pages Function at `/api/analyze-meal`; production uses the server-side `MEAL_API_KEY` secret while local Vite development keeps the existing direct-call path.
- Overhauled the cockpit UI with Orbitron/Rajdhani typography, animated blood-cell and scan-line atmosphere, stronger screen transitions, a sci-fi meal scanner, polished buttons, and responsive upgrade cards.
- Rebuilt the live HUD with labeled score and timer modules, a segmented energy bar with low-health feedback, collectible pickup notices, and damage shake feedback.
- Reduced the submarine's forward speed from 14 to 8.4 units per second (60% of the previous speed).
- Verified the meal scan, title, cutscene, live gameplay HUD, and 390x844 mobile layout in the browser with no console errors; the production build passes.
- Reduced the submarine's forward speed again from 8.4 to 5.04 units per second, which is 60% of the previous speed; the production build and gameplay smoke test pass.
- Added a full landing experience with a dedicated animated Three.js artery scene, the real submarine model, plaque and crystal set dressing, responsive mission briefing sections, accessible launch controls, reduced-motion support, and a transition into the existing meal scan flow.
- Applied the ui-ux-pro-max accessibility and interaction guidance; the production build passes with the new landing experience.

## TODO

- Visual verification reached the boss encounter, but the long automated run ended behind the game-over overlay; a clean yellow-boss screenshot is still pending.
- Run the leaderboard migration in the Supabase SQL Editor before live score reads and writes can succeed.
- Run both leaderboard migrations in filename order; the second creates the Storage bucket and meal-detail columns.
