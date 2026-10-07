import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import PropControls from '../../src/ui/PropControls.vue';

describe('PropControls', () => {
	it('emits updated model on input', async () => {
		const w = mount(PropControls, {
			props: {controls: [{kind: 'text', name: 'a', required: false}], modelValue: {a: 'x'}}
		});
		await w.find('input').setValue('y');
		expect(w.emitted('update:modelValue')![0]).toEqual([{a: 'y'}]);
	});
	it('shows json parse error', async () => {
		const w = mount(PropControls, {props: {controls: [{kind: 'json', name: 'o', required: false}], modelValue: {o: {}}}});
		await w.find('textarea').setValue('{');
		expect(w.find('.vcc-err').exists()).toBe(true);
	});
});
