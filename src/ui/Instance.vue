<script setup lang="ts">
	import {onErrorCaptured, ref, watch, type Component} from 'vue';

	// renders one component instance; an error shows here instead of taking the whole canvas down
	const p = defineProps<{comp: Component; attrs: Record<string, unknown>; slots: Record<string, string>}>();
	const error = ref<Error | null>(null);

	onErrorCaptured((e) => {
		error.value = e as Error;
		return false;
	});
	watch(
		() => [p.comp, p.attrs, p.slots],
		() => (error.value = null)
	);
</script>

<template>
	<pre v-if="error" class="vcc-err">{{ error.message }}{{ '\n' }}{{ error.stack }}</pre>
	<component :is="comp" v-else v-bind="attrs">
		<template v-for="(text, name) in slots" :key="name" #[name]>{{ text }}</template>
	</component>
</template>
