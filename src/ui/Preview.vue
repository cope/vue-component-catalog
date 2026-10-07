<script setup lang="ts">
	import {nextTick, ref, watch, type Component} from 'vue';
	import Instance from './Instance.vue';

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

	// example props may be circular/BigInt: key becomes constant, so the classes warning can go stale for them
	const safeKey = (v: unknown) => {
		try {
			return JSON.stringify(v);
		} catch {
			return '';
		}
	};
	const warning = ref('');
	const stage = ref<HTMLElement>();

	// classes/attrs only reach a single-root, attr-inheriting component
	watch(
		() => [p.comp, safeKey(p.props), safeKey(p.slots), p.classes],
		async () => {
			await nextTick();
			const roots = [...(stage.value?.childNodes ?? [])].filter((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent?.trim()));
			warning.value = (p.comp as any).inheritAttrs === false || roots.length > 1 ? 'Classes cannot apply: component is multi-root or has inheritAttrs: false.' : '';
		},
		{immediate: true, flush: 'post'}
	);
</script>

<template>
	<div class="vcc-backdrop">
		<div :class="['vcc-canvas', `vcc-bg-${bg}`]" :style="{width}">
			<p v-if="warning && classes" class="vcc-warn">{{ warning }}</p>
			<component :is="'style'">.vcc-stage > * { {{ css }} }</component>
			<div ref="stage" class="vcc-stage">
				<Instance :comp="comp" :attrs="{...props, ...handlers, class: classes}" :slots="slots" />
			</div>
			<div v-for="v in variants" :key="v.name" class="vcc-variant">
				<small>{{ v.name }}</small>
				<div class="vcc-stage">
					<Instance :comp="comp" :attrs="{...base, ...v.props, ...handlers, class: classes}" :slots="slots" />
				</div>
			</div>
		</div>
	</div>
</template>
