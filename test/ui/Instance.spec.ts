import {describe, expect, it} from 'vitest';
import {defineComponent, h} from 'vue';
import {flushPromises, mount} from '@vue/test-utils';
import Instance from '../../src/ui/Instance.vue';
import Preview from '../../src/ui/Preview.vue';

const Ok = defineComponent({
	props: {bad: Boolean},
	render() {
		if (this.bad) throw new Error('variant boom');
		return h('b', {class: 'ok'}, this.$slots.default?.());
	}
});

describe('Instance', () => {
	it('renders component with attrs and slot', () => {
		const w = mount(Instance, {props: {comp: Ok, attrs: {class: 'x'}, slots: {default: 'hi'}}});
		expect(w.find('b').text()).toBe('hi');
		expect(w.find('b').classes()).toContain('x');
	});
	it('shows its own error and recovers when attrs change', async () => {
		const w = mount(Instance, {props: {comp: Ok, attrs: {bad: true}, slots: {}}});
		await flushPromises();
		expect(w.find('.vcc-err').text()).toContain('variant boom');
		await w.setProps({attrs: {bad: false}});
		expect(w.find('b').exists()).toBe(true);
	});
	it('a failing variant does not blank the main instance', async () => {
		const w = mount(Preview, {
			props: {comp: Ok, props: {}, handlers: {}, slots: {}, classes: '', css: '', variants: [{name: 'V', props: {bad: true}}], base: {}, width: '100%', bg: 'white'}
		});
		await flushPromises();
		expect(w.findAll('b.ok')).toHaveLength(1);
		expect(w.find('.vcc-variant .vcc-err').text()).toContain('variant boom');
	});
});
