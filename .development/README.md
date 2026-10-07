# vue-component-catalog - plan

Zero-story, live component catalog for Vue 3 + Vite projects. A Vite plugin finds every component by glob, serves a
dev-only catalog page, generates prop controls from real TypeScript types, lets a designer tweak props/slot/classes/CSS
(with runtime Tailwind), and copies a paste-ready change request for an AI assistant (or a developer) to apply.

Repo: `github.com/cope/vue-component-catalog` | npm name `vue-component-catalog`: free (checked 2026-10-07).
First consumers: `tsopany/vetiaki-app`, then `tsopany/shematic-app` (both Vue 3.5, Vite 8, Tailwind 4 via postcss,
Pinia; shematic adds vue-i18n - good test of the `setup` hook).

## Goals / non-goals

- **No hardcoded list, no story files.** A new `.vue` file appears in the catalog on HMR; a deleted one disappears.
- Never touches the consumer's router, never ends up in their production build.
- 3 options, all with sensible defaults.
- Non-goals (add when asked): writing edits back to disk, visual regression, catalog for views/pages, Options-API-heavy
  codebases beyond runtime-props fallback, Nuxt module.

## Consumer API

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import componentCatalog from 'vue-component-catalog';

export default defineConfig({
	plugins: [
		vue(),
		componentCatalog({
			include: 'src/components/**/*.vue', // string | string[], default shown
			themeCss: 'src/style.css', // optional; enables runtime Tailwind with this file's @theme
			setup: 'src/catalog.setup.ts' // optional; installs app plugins/CSS for the preview
		})
	]
});
```

```ts
// src/catalog.setup.ts (consumer-owned)
import type {App} from 'vue';
import {createPinia} from 'pinia';
import './style.css';

export default (app: App) => {
	app.use(createPinia());
};
```

Open `http://localhost:<port>/__catalog` while `vite serve` runs.

Optional per-component examples, co-located: `Button.vue` + `Button.catalog.ts`:

```ts
import {defineCatalog} from 'vue-component-catalog/define';

export default defineCatalog({
	props: {variant: 'primary', loading: false},
	slot: 'Save',
	variants: [{name: 'Danger', props: {variant: 'danger'}}] // optional, rendered side by side
});
```

## Architecture

```
vite.config ──> plugin (Node, apply: 'serve')
                 ├─ configureServer: GET /__catalog -> HTML (via server.transformIndexHtml) loading virtual entry
                 ├─ virtual:vue-component-catalog/entry     createApp(CatalogApp) + await consumer setup(app)
                 ├─ virtual:vue-component-catalog/components   import.meta.glob(<include>) generated from options
                 ├─ virtual:vue-component-catalog/examples     import.meta.glob(<include with .vue -> .catalog.{ts,js}>, {eager: true})
                 ├─ virtual:vue-component-catalog/meta         per-file vue-component-meta JSON (lazy, cached)
                 └─ virtual:vue-component-catalog/theme        @theme blocks extracted from themeCss (string)
                                     │
                 ui/ (shipped as .vue source, compiled by the consumer's @vitejs/plugin-vue)
                   CatalogApp.vue  Sidebar  Preview  PropControls  DesignPanel  CopyButton
```

Key points:

- **Why a plugin, not a component:** `import.meta.glob` needs a literal in source; the plugin writes that source from
  options. Same for the setup import.
- **Own page, not a route:** independent of vue-router setup; `apply: 'serve'` keeps it out of `vite build` entirely.
- **Prop types:** `vue-component-meta` (`createChecker` against the consumer's `tsconfig.json`, overridable via
  `tsconfig` option only if a real project needs it) gives unions as enum dropdowns, slots, emits, JSDoc descriptions.
  Meta is computed lazily per file on request and invalidated in `handleHotUpdate`. **Fallback:** if meta fails or
  `typescript` is missing, derive controls from runtime `Comp.props` (`String`/`Number`/`Boolean`/`Array`/`Object`).
- **Runtime Tailwind:** only when `themeCss` is set. UI dynamic-imports `@tailwindcss/browser` and injects
  `<style type="text/tailwindcss">` with the extracted `@theme` blocks so tokens like `bg-primary` resolve.
  Build-time CSS still comes from the consumer's `setup` (imports their `style.css`).
- **Catalog chrome styling:** plain scoped CSS with a `vcc-` prefix, no Tailwind dependency. Consumer preflight will
  apply to it; keep chrome robust to resets. Iframe isolation only if leaks prove real.
- **Package format:** plugin built with `tsdown` to `dist/` (ESM + d.ts); `ui/` shipped as raw `.vue`/`.ts`.
  Exports: `.` (plugin), `./define` (`defineCatalog` + types), `./client` (virtual module type declarations).
- **Deps:** peer `vue ^3.5`, `vite >=6`, `@vitejs/plugin-vue >=5`; deps `vue-component-meta`, `@tailwindcss/browser`;
  peer-optional `typescript`. Consumers install as devDependency.

## Phases

### Phase 0 - Scaffold

- `package.json` (type module, exports, files: `dist`, `ui`), `tsdown`, `tsconfig`, vitest, eslint + prettier
  (match vetiaki: tabs, single quotes, no bracket spacing), MIT license, `.nvmrc` node 24.
- `playground/` - minimal Vite + Vue + Tailwind 4 app with sample components covering: string-union prop, boolean,
  number, object/array, `v-model`, named + default slots, emits, multi-root component, `inheritAttrs: false`,
  component that throws on render, component needing Pinia. `pnpm dev` runs it with the plugin from source.
- CI: GitHub Actions - lint, typecheck, test, build.

### Phase 1 - Plugin core

- Options normalize/validate (`include` string -> array; paths resolved against `config.root`; missing `themeCss`/`setup`
  file -> clear startup error).
- `/__catalog` middleware + virtual `entry`, `components`, `examples` modules; `resolveId`/`load` for `virtual:` ids;
  examples glob derived from `include`.
- Done when: playground lists all sample components; adding a file shows it after HMR without restart.

### Phase 2 - UI: browse + render

- Sidebar grouped by folder relative to the common include root, filter box, selection in `?c=ui/Button`.
- Preview: lazy-load component, `<component :is>` inside an error boundary (`onErrorCaptured`) showing the error and
  stack instead of crashing.
- Width toggles (375 / 768 / full), background toggle (white / grey / checker).

### Phase 3 - Controls

- `virtual:.../meta?file=<path>` (or a dev-server JSON endpoint) returning props/events/slots from `vue-component-meta`.
- Pure helper `propControls(meta | runtimeProps)` -> control descriptors: union of literals -> select, string -> text,
  number -> number, boolean -> checkbox, object/array -> JSON textarea with parse errors, function -> skipped.
- Seed from defaults, then from `*.catalog.ts` example if present. Required-without-default gets a typed placeholder.
- `modelValue`/`v-model:x` wired to local refs; slot text boxes for each slot from meta (default only in fallback);
  events panel logging emitted events with payloads; Reset.

### Phase 4 - Design editing

- Classes input (falls through as `class` attr). Detect when it can't apply (multi-root / `inheritAttrs: false`:
  check rendered root count + component option) and show a warning.
- Raw CSS textarea, injected scoped to the preview wrapper (`.vcc-preview :where(...)` / nested CSS).
- Runtime Tailwind per Architecture; status chip "Tailwind runtime: on/off".

### Phase 5 - Copy for AI

- Pure helper `buildChangeRequest(state, defaults)` - only changed sections:

  ````
  Component: src/components/ui/Button.vue
  Props: {"variant": "ghost", "size": "sm"}
  Slot (default): "Save"
  Added classes: rounded-full px-4 shadow-sm
  CSS:
  ```css
  padding: 6px 14px;
  ```
  Intent: <designer's free text>
  ````

- `navigator.clipboard.writeText` with a textarea-select fallback (non-secure contexts, e.g. LAN IP).
- Optional "Copy as example" -> emits a `Button.catalog.ts` body from current props, so designers can grow examples.

### Phase 6 - Consumers

- vetiaki-app: install via `pnpm link` / `file:`, add plugin + `catalog.setup.ts`, write examples for DataTable,
  modals, SlideOver, efakture panels. Plan lives in `vetiaki-app/.development/components/README.md`.
- shematic-app: same, plus vue-i18n in setup. **Gate:** works with zero package changes specific to either app.
  Any change needed = fix the package generically.

### Phase 7 - Release

- README (install, options, examples convention, Copy-for-AI workflow, limitations), CHANGELOG, `0.1.0`.
- Until published, consumers can use `github:cope/vue-component-catalog#v0.1.0`.
- `npm publish` (unscoped name is free; reserve early if desired).

## Tests

- Unit (vitest): options normalization, examples glob derivation, `@theme` extraction, `propControls` for every shape
  (meta and runtime fallback), `buildChangeRequest` diffing.
- Plugin integration: `createServer` on `playground/`, GET `/__catalog` returns HTML; `load` of each virtual module
  contains the expected glob; `vite build` of playground contains no catalog code.
- Manual in playground: add/remove component live; `bg-red-500` typed in classes renders; throwing component shows error.

## Open questions

- `@theme` extraction: confirm `@tailwindcss/browser` handles `@theme` with `var(--color-blue-600)` refs to its own
  defaults (expected yes); if the consumer CSS uses `@plugin`/`@source`, those are skipped - document.
- `vue-component-meta` startup cost on large projects - lazy per file should keep it fine; measure in vetiaki.
- Tailwind 3 consumers (`tailwind.config.js`): out of scope for 0.1; `themeCss` simply unset = no runtime Tailwind.
