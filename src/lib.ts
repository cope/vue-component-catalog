import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

export interface CatalogOptions {
	include?: string | string[];
	themeCss?: string;
	setup?: string;
}

export interface ResolvedOptions {
	include: string[];
	themeCss?: string;
	setup?: string;
}

const clean = (p: string) => p.replace(/^\.?\//, '');

export function normalizeOptions(opts: CatalogOptions = {}, root: string): ResolvedOptions {
	const include = [opts.include ?? 'src/components/**/*.vue'].flat().map(clean);
	const file = (name: 'themeCss' | 'setup') => {
		if (!opts[name]) return undefined;
		const abs = resolve(root, opts[name]);
		if (!existsSync(abs)) throw new Error(`[vue-component-catalog] ${name} file not found: ${abs}`);
		return abs;
	};
	return {include, themeCss: file('themeCss'), setup: file('setup')};
}

/** root-relative globs for import.meta.glob (negations keep their `!`) */
export const includeGlobs = (include: string[]) => include.map((p) => (p.startsWith('!') ? '!/' + p.slice(1) : '/' + p));

/** `src/**\/*.vue` -> `/src/**\/*.catalog.{ts,js}`; non-.vue patterns have no examples */
export const examplesGlobs = (include: string[]) => include.filter((p) => p.endsWith('.vue')).map((p) => '/' + p.replace(/\.vue$/, '.catalog.{ts,js}'));

/** all top-level `@theme ... { }` blocks (brace-balanced), joined */
export function extractTheme(css: string): string {
	const blocks: string[] = [];
	for (const m of css.matchAll(/@theme\b[^{]*\{/g)) {
		let depth = 1;
		let i = m.index! + m[0].length;
		while (i < css.length && depth) {
			if (css[i] === '{') depth++;
			else if (css[i] === '}') depth--;
			i++;
		}
		blocks.push(css.slice(m.index, i));
	}
	return blocks.join('\n');
}

/** tsconfig.app.json (vite template) wins over a references-only tsconfig.json */
export const findTsconfig = (root: string) => ['tsconfig.app.json', 'tsconfig.json'].map((f) => resolve(root, f)).find(existsSync);
