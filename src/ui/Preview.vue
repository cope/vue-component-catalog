<script setup lang="ts">
	import {nextTick, onErrorCaptured, ref, watch, type Component} from 'vue';

	const p = defineProps<{
		comp: Component;
		props: Record<string, unknown>;
		handlers: Record<string, (..._args: unknown[]) => void>;
		slots: Record<string, string>;
		classes: string;
		css: string;
		variants: {name: string; props: Record<string, unknown>}[];
		base: Record<string, unknown>;
		width: string;
		bg: string;
	}>();

	const error = ref<Error | null>(null);
	const warning = ref('');
	const stage = ref<HTMLElement>();

	onErrorCaptured((e) => {
		error.value = e as Error;
		return false;
	});

	// classes/attrs only reach a single-root, attr-inheriting component
	watch(
		() => [p.comp, p.props, p.slots, p.classes],
		async () => {
			error.value = null;
			await nextTick();
			const roots = [...(stage.value?.childNodes ?? [])].filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()));
			warning.value = (p.comp as any).inheritAttrs === false || roots.length > 1 ? 'Classes cannot apply: component is multi-root or has inheritAttrs: false.' : '';
		},
		{deep: true, immediate: true, flush: 'post'}
	);
</script>

<template>
	<div class="vcc-backdrop">
		<div :class="['vcc-canvas', `vcc-bg-${bg}`]" :style="{width}">
			<p v-if="warning && classes" class="vcc-warn">{{ warning }}</p>
			<component :is="'style'">.vcc-stage > * { {{ css }} }</component>
			<pre v-if="error" class="vcc-err">{{ error.message }}{{ '\n' }}{{ error.stack }}</pre>
			<div v-else>
				<div ref="stage" class="vcc-stage">
					<component :is="comp" v-bind="{...props, ...handlers, class: classes}">
						<template v-for="(text, name) in slots" :key="name" #[name]>{{ text }}</template>
					</component>
				</div>
				<div v-for="v in variants" :key="v.name" class="vcc-variant">
					<small>{{ v.name }}</small>
					<div class="vcc-stage">
						<component :is="comp" v-bind="{...base, ...v.props, ...handlers}">
							<template v-for="(text, name) in slots" :key="name" #[name]>{{ text }}</template>
						</component>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
