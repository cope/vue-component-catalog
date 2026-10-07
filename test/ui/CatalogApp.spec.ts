import {describe, expect, it, vi} from 'vitest';
import {defineComponent, h} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';
import CatalogApp from '../../src/ui/CatalogApp.vue';

describe('CatalogApp', () => {
	it('lists components and renders the selected one', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ok: false}))
		);
		history.replaceState(null, '', '?c=ui/B');
		const B = defineComponent({
			props: {n: {type: Number, default: 2}},
			render() {
				return h('span', 'n=' + this.n);
			}
		});
		const w = mount(CatalogApp, {
			props: {components: {'/src/c/A.vue': async () => ({}), '/src/c/ui/B.vue': async () => B}, examples: {}, theme: '', tailwind: false}
		});
		await flushPromises();
		expect(w.findAll('.vcc-side a').map((a) => a.text())).toEqual(['A', 'B']);
		expect(w.find('.vcc-stage span').text()).toBe('n=2');
		expect(w.find('.vcc-request').text()).toBe('Component: src/c/ui/B.vue');
	});
});
