import {describe, expect, it} from 'vitest';
import {buildChangeRequest, buildExample, commonDir, parseDefault, propControls, runtimeProps, seedProps} from '../../src/ui/lib.ts';

describe('propControls', () => {
	it('maps every shape', () => {
		const c = propControls([
			{name: 'v', type: `'a' | 'b'`},
			{name: 's', type: 'string'},
			{name: 'n', type: 'number'},
			{name: 'b', type: 'boolean'},
			{name: 'o', type: '{a: 1}'},
			{name: 'arr', type: 'string[]'},
			{name: 'fn', type: '(x: number) => void'}
		]);
		expect(c.map((x) => x.kind)).toEqual(['select', 'text', 'number', 'checkbox', 'json', 'json']);
		expect(c[0]).toMatchObject({options: ['a', 'b']});
	});
	it('runtime fallback', () => {
		const p = runtimeProps({a: String, b: {type: Boolean, required: true}, c: Array});
		expect(propControls(p).map((x) => x.kind)).toEqual(['text', 'checkbox', 'json']);
	});
	it('seeds defaults, placeholders, example', () => {
		const p = [
			{name: 'v', type: `'a' | 'b'`, default: `"b"`},
			{name: 'n', type: 'number', required: true},
			{name: 'x', type: 'string'}
		];
		expect(seedProps([{name: 'l', type: 'string[]', required: true}])).toEqual({l: []});
		expect(seedProps(p)).toEqual({v: 'b', n: 0});
		expect(seedProps(p, {x: 'hi'})).toEqual({v: 'b', n: 0, x: 'hi'});
	});
});

describe('buildChangeRequest', () => {
	const defaults = {props: {variant: 'primary'}, slots: {default: 'Save'}};
	const base = {
		component: 'src/Button.vue',
		props: {variant: 'primary'},
		slots: {default: 'Save'},
		classes: '',
		css: '',
		intent: ''
	};
	it('only changed sections', () => {
		expect(buildChangeRequest(base, defaults)).toBe('Component: src/Button.vue');
		expect(
			buildChangeRequest(
				{
					...base,
					props: {variant: 'ghost'},
					slots: {default: 'Go'},
					classes: ' rounded-full ',
					css: 'padding: 6px;',
					intent: 'softer'
				},
				defaults
			)
		).toBe('Component: src/Button.vue\nProps: {"variant":"ghost"}\nSlot (default): "Go"\nAdded classes: rounded-full\nCSS:\n```css\npadding: 6px;\n```\nIntent: softer');
	});
});

it('commonDir', () => {
	expect(commonDir(['/src/c/ui/A.vue', '/src/c/B.vue'])).toBe('/src/c/');
	expect(commonDir(['/src/c/A.vue'])).toBe('/src/c/');
});

it('parseDefault and buildExample', () => {
	expect(parseDefault('false')).toBe(false);
	expect(parseDefault(`'x'`)).toBe('x');
	expect(parseDefault('() => 1')).toBeUndefined();
	expect(buildExample({a: 1}, {default: 'Hi', h: ''})).toContain('slot: "Hi"');
});
