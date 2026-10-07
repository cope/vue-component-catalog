<script setup lang="ts">
	import {ref} from 'vue';
	import type {Control} from './lib.ts';

	defineProps<{controls: Control[]}>();
	const model = defineModel<Record<string, unknown>>({required: true});
	const errors = ref<Record<string, string>>({});
	// raw text while a JSON box is focused, so re-renders don't overwrite half-typed input
	const drafts = ref<Record<string, string>>({});

	const set = (name: string, value: unknown) => (model.value = {...model.value, [name]: value});
	function setJson(name: string, text: string) {
		drafts.value[name] = text;
		try {
			set(name, JSON.parse(text));
			delete errors.value[name];
		} catch (e) {
			errors.value[name] = (e as Error).message;
		}
	}
</script>

<template>
	<label v-for="c in controls" :key="c.name" class="vcc-field">
		<span>{{ c.name }}<b v-if="c.required"> *</b></span>
		<select v-if="c.kind === 'select'" :value="model[c.name]" @change="set(c.name, ($event.target as HTMLSelectElement).value || undefined)">
			<option v-if="!c.required" value=""></option>
			<option v-for="o in c.options" :key="o" :value="o">{{ o }}</option>
		</select>
		<input v-else-if="c.kind === 'checkbox'" type="checkbox" :checked="!!model[c.name]" @change="set(c.name, ($event.target as HTMLInputElement).checked)" />
		<input
			v-else-if="c.kind === 'number'"
			type="number"
			:value="model[c.name]"
			@input="set(c.name, Number.isNaN(($event.target as HTMLInputElement).valueAsNumber) ? undefined : ($event.target as HTMLInputElement).valueAsNumber)" />
		<input v-else-if="c.kind === 'text'" :value="model[c.name]" @input="set(c.name, ($event.target as HTMLInputElement).value)" />
		<template v-else>
			<textarea
				rows="3"
				:value="drafts[c.name] ?? JSON.stringify(model[c.name], null, 1)"
				@input="setJson(c.name, ($event.target as HTMLTextAreaElement).value)"
				@blur="(delete drafts[c.name], delete errors[c.name])" />
			<small v-if="errors[c.name]" class="vcc-err">{{ errors[c.name] }}</small>
		</template>
	</label>
</template>
