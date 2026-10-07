import {describe, expect, it} from 'vitest';
import {examplesGlobs, extractTheme, normalizeOptions} from '../src/lib.ts';

describe('plugin lib', () => {
	it('normalizes include and rejects missing files', () => {
		expect(normalizeOptions({include: './a/*.vue'}, '/tmp').include).toEqual(['a/*.vue']);
		expect(normalizeOptions({}, '/tmp').include).toEqual(['src/components/**/*.vue']);
		expect(() => normalizeOptions({setup: 'nope.ts'}, '/tmp')).toThrow(/setup file not found/);
	});
	it('derives examples globs', () => {
		expect(examplesGlobs(['src/**/*.vue', 'x/*.tsx'])).toEqual(['/src/**/*.catalog.{ts,js}']);
	});
	it('extracts nested @theme blocks', () => {
		const css = `@import 'tailwindcss';\n@theme { --a: 1; @keyframes x { to { opacity: 1 } } }\n.x { color: red }\n@theme inline { --b: var(--a); }`;
		expect(extractTheme(css)).toBe(`@theme { --a: 1; @keyframes x { to { opacity: 1 } } }\n@theme inline { --b: var(--a); }`);
	});
});
