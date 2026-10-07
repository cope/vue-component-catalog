import {readFileSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import {searchForWorkspaceRoot, type Plugin} from 'vite';
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
	let checker: Promise<any> | undefined;
	const cache = new Map<string, Meta>();
	let gen = 0; // bumped on file changes; a slow /meta that started before one must not cache its (stale) result

	// promise cached so concurrent first requests share one checker
	const getChecker = () =>
		(checker ??= (async () => {
			const tsconfig = findTsconfig(root);
			if (!tsconfig) throw new Error(`[vue-component-catalog] no tsconfig.json found in ${root}`);
			const {createChecker} = await import('vue-component-meta');
			return createChecker(tsconfig, {forceUseTs: true});
		})().catch((e) => {
			checker = undefined; // retry on next request (e.g. tsconfig added later)
			throw e;
		}));

	async function getMeta(file: string): Promise<Meta> {
		if (cache.has(file)) return cache.get(file)!;
		const started = gen;
		const m = (await getChecker()).getComponentMeta(file);
		const meta: Meta = {
			props: m.props.filter((p: any) => !p.global).map((p: any) => ({name: p.name, type: strip(p.type), required: p.required, default: p.default})),
			events: m.events.map((e: any) => e.name),
			slots: m.slots.map((s: any) => s.name)
		};
		if (started === gen) cache.set(file, meta);
		return meta;
	}

	return {
		name: 'vue-component-catalog',
		apply: 'serve',
		// allow replaces vite's default (workspace root), so keep it
		config: (c) => ({server: {fs: {allow: [searchForWorkspaceRoot(c.root ?? process.cwd()), UI]}}}),
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
try {
	await setup?.(app);
	app.mount('#app');
} catch (e) {
	document.getElementById('app').innerHTML = '<pre style="color:#b91c1c;padding:16px">catalog setup failed: ' + String(e?.stack ?? e).replace(/</g, '&lt;') + '</pre>';
	throw e;
}`;
		},
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = new URL(req.url ?? '/', 'https://x');
				if (url.pathname === META) {
					res.setHeader('content-type', 'application/json');
					try {
						const abs = resolve(root, (url.searchParams.get('file') ?? '').replace(/^\//, ''));
						if (!abs.startsWith(resolve(root) + sep) || !abs.endsWith('.vue')) {
							res.statusCode = 400;
							return res.end(JSON.stringify({error: 'file must be a .vue inside the project root'}));
						}
						res.end(JSON.stringify(await getMeta(abs)));
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
		// hotUpdate (not handleHotUpdate): only it fires for created/deleted files
		async hotUpdate({file, type, server}) {
			if (this.environment.name !== 'client') return;
			if (file === opts.themeCss) {
				const mod = server.moduleGraph.getModuleById(RESOLVED);
				if (mod) server.moduleGraph.invalidateModule(mod);
				server.ws.send({type: 'full-reload'});
			}
			if (!/\.(vue|ts)$/.test(file)) return;
			const invalidate = () => {
				cache.clear();
				gen++;
			};
			invalidate();
			try {
				const c = await checker;
				if (type === 'delete') c?.deleteFile(file);
				else c?.updateFile(file, readFileSync(file, 'utf8'));
			} catch {
				// meta is best-effort; the next /meta request reports the real error
			}
			invalidate(); // again: a /meta call during the await above saw the checker before updateFile
		}
	};
}
