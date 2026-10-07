import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import type {Plugin} from 'vite';
import {examplesGlobs, includeGlobs, extractTheme, findTsconfig, normalizeOptions, type CatalogOptions} from './lib.ts';

export type {CatalogOptions};

const ID = 'virtual:vue-component-catalog/entry';
const RESOLVED = '\0' + ID;
const PAGE = '/__catalog';
const META = '/__catalog/meta';
const UI = fileURLToPath(new URL(import.meta.url.includes('/dist/') ? '../src/ui/' : './ui/', import.meta.url));

interface Meta {
	props: {name: string; type: string; required: boolean; default?: string}[];
	events: string[];
	slots: string[];
}

const strip = (t: string) => t.replace(/ \| undefined/g, '');

export default function componentCatalog(options: CatalogOptions = {}): Plugin {
	let root = '';
	let opts: ReturnType<typeof normalizeOptions>;
	let checker: any;
	const cache = new Map<string, Meta>();

	async function getMeta(file: string): Promise<Meta> {
		if (cache.has(file)) return cache.get(file)!;
		if (!checker) {
			const {createChecker} = await import('vue-component-meta');
			checker = createChecker(findTsconfig(root)!, {forceUseTs: true});
		}
		const m = checker.getComponentMeta(file);
		const meta: Meta = {
			props: m.props.filter((p: any) => !p.global).map((p: any) => ({name: p.name, type: strip(p.type), required: p.required, default: p.default})),
			events: m.events.map((e: any) => e.name),
			slots: m.slots.map((s: any) => s.name)
		};
		cache.set(file, meta);
		return meta;
	}

	return {
		name: 'vue-component-catalog',
		apply: 'serve',
		config: () => ({server: {fs: {allow: [UI]}}}),
		configResolved(c) {
			root = c.root;
			opts = normalizeOptions(options, root);
		},
		resolveId: (id) => (id === ID ? RESOLVED : undefined),
		load(id) {
			if (id !== RESOLVED) return;
			let theme = '';
			if (opts.themeCss) {
				this.addWatchFile(opts.themeCss);
				theme = extractTheme(readFileSync(opts.themeCss, 'utf8'));
			}
			const glob = (g: string[], extra = '') => `import.meta.glob(${JSON.stringify(g)}, {${extra}})`;
			return `import {createApp} from 'vue';
import CatalogApp from ${JSON.stringify(UI + 'CatalogApp.vue')};
${opts.setup ? `import setup from ${JSON.stringify(opts.setup)};` : 'const setup = undefined;'}
const components = ${glob(includeGlobs(opts.include), 'import: "default"')};
const examples = ${glob(examplesGlobs(opts.include), 'eager: true, import: "default"')};
const app = createApp(CatalogApp, {components, examples, theme: ${JSON.stringify(theme)}, tailwind: ${!!opts.themeCss}});
await setup?.(app);
app.mount('#app');`;
		},
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = new URL(req.url ?? '/', 'https://x');
				if (url.pathname === META) {
					res.setHeader('content-type', 'application/json');
					try {
						res.end(JSON.stringify(await getMeta(root + '/' + url.searchParams.get('file')!.replace(/^\//, ''))));
					} catch (e) {
						res.statusCode = 500;
						res.end(JSON.stringify({error: String(e)}));
					}
				} else if (url.pathname === PAGE) {
					const html = `<!doctype html><html><head><meta charset="utf-8"><title>Component catalog</title></head><body><div id="app"></div><script type="module" src="/@id/__x00__${ID}"></script></body></html>`;
					res.setHeader('content-type', 'text/html');
					res.end(await server.transformIndexHtml(PAGE, html));
				} else next();
			});
		},
		handleHotUpdate({file}) {
			if (!/\.(vue|ts)$/.test(file)) return;
			cache.clear();
			checker?.reload();
		}
	};
}
