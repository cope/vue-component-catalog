# vue-component-catalog

Zero-story, live component catalog for Vue 3 + Vite. A dev-only Vite plugin finds every component by glob, generates prop
controls from real TypeScript types, lets you tweak props, slots, classes and CSS (with runtime Tailwind), and copies a
paste-ready change request for an AI assistant or a developer.

## Install

```sh
pnpm add -D vue-component-catalog
# until published: pnpm add -D github:cope/vue-component-catalog#v0.1.0
```

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import componentCatalog from 'vue-component-catalog';

export default defineConfig({
	plugins: [
		vue(),
		componentCatalog({
			include: 'src/components/**/*.vue', // string | string[], default shown
			themeCss: 'src/style.css', // optional: enables runtime Tailwind with this file's @theme
			setup: 'src/catalog.setup.ts', // optional: default export (app) => void, install plugins/CSS
			path: '/__catalog' // optional: page url, default shown
		})
	]
});
```

Open `http://localhost:<port>/__catalog` (or your `path`) while `vite` is serving. The plugin is `apply: 'serve'`: nothing lands in
`vite build`.

### Providing context (`wrapper`)

`setup` may return `{wrapper}`: a component that renders its default slot. The whole catalog is rendered inside it, so
anything it provides reaches previewed components (e.g. reka-ui's `TooltipProvider`):

```ts
import {defineComponent, h} from 'vue';
import {TooltipProvider} from 'reka-ui';
import type {CatalogSetup} from 'vue-component-catalog/define';

const Wrapper = defineComponent((_, {slots}) => () => h(TooltipProvider, null, slots));
export default ((app) => {
	app.use(pinia);
	return {wrapper: Wrapper};
}) satisfies CatalogSetup;
```

## Examples (optional)

Co-locate `Button.catalog.ts` next to `Button.vue`:

```ts
import {defineCatalog} from 'vue-component-catalog/define';

export default defineCatalog({
	props: {variant: 'primary'},
	slot: 'Save', // or slots: {header: '...'}
	variants: [{name: 'Danger', props: {variant: 'danger'}}] // rendered side by side
});
```

"Copy as example" in the catalog emits this file from the current state.

## Copy for AI

Tweak props, slot text, classes or CSS, add an intent, press **Copy change request**. Only changed sections are included:

```
Component: src/components/ui/Button.vue
Props: {"variant":"ghost"}
Added classes: rounded-full px-4
CSS:
...
Intent: softer
```

## Limitations

- Types come from `vue-component-meta` (needs `typescript`; uses `tsconfig.app.json`, else `tsconfig.json`). If it fails,
  controls fall back to runtime `props` (string/number/boolean/other).
- Runtime Tailwind is Tailwind 4 only; `@plugin`/`@source` in `themeCss` are ignored. Tailwind 3: leave `themeCss` unset.
- Classes cannot apply to multi-root components or `inheritAttrs: false` (a warning is shown).
- Catalog chrome shares the page with your global CSS (preflight applies to it).
- Does not write edits to disk; no Nuxt module; components only, not views.
