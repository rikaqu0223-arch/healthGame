# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + Three.js browser game prototype.

- `index.html` is the app entry point and mounts the game UI.
- `src/main.js` wires the game loop and top-level interactions.
- `src/scene.js` owns renderer, camera, lighting, and scene setup.
- `src/player.js`, `src/objects.js`, and `src/sonar.js` contain gameplay objects and mechanics.
- `src/hud.js` handles overlay state and score display.
- `src/style.css` contains global UI and canvas styling.
- `public/` stores static assets copied directly by Vite.
- `dist/` and `node_modules/` are generated and must not be committed.

There is no dedicated `tests/` directory yet.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the Vite development server for local playtesting.
- `npm run build` creates a production build in `dist/`; use this as the minimum verification before commits.
- `npm run preview` serves the production build locally for final smoke testing.

No `npm test` script is currently configured.

## Coding Style & Naming Conventions

Use modern ES modules and keep files focused by responsibility. Prefer `const` and `let` over `var`, and use descriptive camelCase names for variables, functions, and object properties. Use PascalCase only for classes or constructor-style factories.

Keep indentation at two spaces for JavaScript, CSS, HTML, and JSON. Match the existing direct, lightweight style; avoid introducing frameworks or large abstractions unless they simplify gameplay code clearly.

## Testing Guidelines

Automated tests are not set up yet. For now, verify changes with:

```bash
npm run build
npm run preview
```

Manually smoke test the core loop in a browser: game starts, submarine moves, collectibles update score, obstacles collide, sonar displays, restart works, and the viewport resizes cleanly.

If tests are added later, place them near the code they cover or under `src/__tests__/`, and name them `*.test.js`.

## Commit & Pull Request Guidelines

Current history uses short imperative commit messages, for example `Initial BioCurrent MVP`. Continue with concise messages such as `Add sonar cooldown UI` or `Tune tunnel obstacle spawn rate`.

Pull requests should include a short summary, testing notes, and screenshots or screen recordings for visible gameplay/UI changes. Link related issues when available. Keep generated folders such as `dist/` and `node_modules/` out of PRs.

## Security & Configuration Tips

Do not commit secrets, local environment files, or downloaded third-party assets without clear licenses. Prefer permissive assets such as CC0, MIT, or explicitly free-for-commercial-use files, and document attribution requirements in the README when needed.
