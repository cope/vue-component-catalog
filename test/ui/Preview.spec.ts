import {describe, expect, it} from 'vitest';
import {defineComponent, h} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';
import Preview from '../../src/ui/Preview.vue';

/* eslint-disable vue/one-component-per-file */
const base = {props: {}, handlers: {}, slots: {}, classes: '', css: '', variants: [], base: {}, width: '100%', bg: 'white'};

describe('Preview', () => {
	it('renders component with slot and class', async () => {
		const comp = defineComponent({
			render() {
				return h('b', {class: 'x'}, this.$slots.default?.());
			}
		});
		const w = mount(Preview, {props: {...base, comp, slots: {default: 'hi'}, classes: 'y'}});
		await flushPromises();
		expect(w.find('b').text()).toBe('hi');
		expect(w.find('b').classes()).toContain('y');
	});
	it('shows error instead of crashing', async () => {
		const comp = defineComponent({
			setup() {
				throw new Error('boom');
			},
			render: () => null
		});
		const w = mount(Preview, {props: {...base, comp}});
		await flushPromises();
		expect(w.find('.vcc-err').text()).toContain('boom');
	});
	it('warns for multi-root with classes', async () => {
		const comp = defineComponent({render: () => [h('i'), h('i')]});
		const w = mount(Preview, {props: {...base, comp, classes: 'y'}});
		await flushPromises();
		expect(w.find('.vcc-warn').exists()).toBe(true);
	});
});
