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

## TODO

- Visual verification reached the boss encounter, but the long automated run ended behind the game-over overlay; a clean yellow-boss screenshot is still pending.
