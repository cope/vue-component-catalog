<script setup lang="ts">
	import {camelize, computed, onMounted, reactive, ref, shallowRef, toHandlerKey, watch, type Component} from 'vue';
	import PropControls from './PropControls.vue';
	import Preview from './Preview.vue';
	import {buildChangeRequest, buildExample, commonDir, copyText, propControls, runtimeProps, seedProps, type PropInfo} from './lib.ts';

	const p = defineProps<{
		components: Record<string, () => Promise<Component>>;
		examples: Record<string, any>;
		theme: string;
		tailwind: boolean;
	}>();

	const keys = Object.keys(p.components).sort();
	const root = commonDir(keys);
	const idOf = (k: string) => k.slice(root.length).replace(/\.vue$/, '');
	const byId = Object.fromEntries(keys.map((k) => [idOf(k), k]));
	const filter = ref('');
	const groups = computed(() => {
		const g: Record<string, string[]> = {};
		for (const id of Object.keys(byId).filter((i) => i.toLowerCase().includes(filter.value.toLowerCase()))) {
			const dir = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
			g[dir] ??= [];
			g[dir].push(id);
		}
		return g;
	});

	const selected = ref(new URLSearchParams(location.search).get('c') ?? '');
	const select = (id: string) => {
		selected.value = id;
		history.pushState(null, '', `?c=${id}`);
	};

	const comp = shallowRef<Component>();
	const loadError = ref('');
	const info = reactive({props: [] as PropInfo[], events: [] as string[], slots: ['default'] as string[]});
	const state = reactive({
		props: {} as Record<string, unknown>,
		slots: {} as Record<string, string>,
		classes: '',
		css: '',
		intent: ''
	});
	const defaults = ref({props: {} as Record<string, unknown>, slots: {} as Record<string, string>});
	const variants = ref<{name: string; props: Record<string, unknown>}[]>([]);
	const log = ref<string[]>([]);
	const width = ref('100%');
	const bg = ref('white');
	const clone = <T,>(v: T): T => structuredClone(v);
	const reset = () => Object.assign(state, {props: clone(defaults.value.props), slots: {...defaults.value.slots}});
	const controls = computed(() => propControls(info.props));

	async function load(id: string) {
		const key = byId[id];
		comp.value = undefined;
		loadError.value = '';
		if (!key) return;
		try {
			const c = ((await p.components[key]()) as any) ?? {};
			comp.value = c;
			const meta = await fetch(`/__catalog/meta?file=${encodeURIComponent(key)}`)
				.then(
					(r) => (r.ok ? r.json() : Promise.reject()),
					() => Promise.reject()
				)
				.catch(() => null);
			const emits = c.emits;
			Object.assign(
				info,
				meta ?? {
					props: runtimeProps(c.props),
					events: Array.isArray(emits) ? emits : Object.keys(emits ?? {}),
					slots: ['default']
				}
			);
			const ex = p.examples[key.replace(/\.vue$/, '.catalog.ts')] ?? p.examples[key.replace(/\.vue$/, '.catalog.js')] ?? {};
			const slots = Object.fromEntries(info.slots.map((s) => [s, s === 'default' ? (ex.slot ?? '') : (ex.slots?.[s] ?? '')]));
			const props = seedProps(info.props, ex.props);
			defaults.value = {props: clone(props), slots: {...slots}};
			Object.assign(state, {props, slots, classes: '', css: '', intent: ''});
			variants.value = ex.variants ?? [];
			log.value = [];
		} catch (e) {
			loadError.value = String(e);
		}
	}
	watch(selected, load, {immediate: true});
	addEventListener('popstate', () => (selected.value = new URLSearchParams(location.search).get('c') ?? ''));

	// every declared event is logged; update:x also writes back to prop x (v-model)
	const handlers = computed(() =>
		Object.fromEntries(
			info.events.map((name) => [
				toHandlerKey(camelize(name)),
				(...args: unknown[]) => {
					log.value.unshift(`${name} ${JSON.stringify(args)}`);
					if (name.startsWith('update:')) state.props = {...state.props, [name.slice(7)]: args[0]};
				}
			])
		)
	);

	const request = computed(() => buildChangeRequest({component: root.replace(/^\//, '') + selected.value + '.vue', ...state}, defaults.value));
	const copied = ref('');
	const copy = async (what: string, text: string) => {
		await copyText(text);
		copied.value = what;
		setTimeout(() => (copied.value = ''), 1200);
	};

	onMounted(async () => {
		if (!p.tailwind) return;
		await import('@tailwindcss/browser');
		document.head.append(Object.assign(document.createElement('style'), {type: 'text/tailwindcss', textContent: p.theme}));
	});
</script>

<template>
	<div class="vcc-app">
		<nav class="vcc-side">
			<div class="vcc-brand">Component catalog</div>
			<input v-model="filter" placeholder="Filter…" />
			<template v-for="(ids, dir) in groups" :key="dir">
				<h4 v-if="dir">{{ dir }}</h4>
				<a v-for="id in ids" :key="id" href="#" :class="{active: id === selected}" @click.prevent="select(id)">{{ id.split('/').pop() }}</a>
			</template>
		</nav>
		<main class="vcc-main">
			<p v-if="!selected" class="vcc-empty">Pick a component.</p>
			<p v-else-if="loadError" class="vcc-err">{{ loadError }}</p>
			<template v-else-if="comp">
				<section class="vcc-stagecard">
					<header class="vcc-bar">
						<strong>{{ selected.split('/').pop() }}</strong>
						<span class="vcc-group">
							<button v-for="w in ['375px', '768px', '100%']" :key="w" :class="{on: width === w}" @click="width = w">
								{{ w === '100%' ? 'full' : w }}
							</button>
						</span>
						<span class="vcc-group">
							<button v-for="b in ['white', 'grey', 'checker']" :key="b" :class="{on: bg === b}" @click="bg = b">
								{{ b }}
							</button>
						</span>
						<span class="vcc-chip">Tailwind runtime: {{ tailwind ? 'on' : 'off' }}</span>
					</header>
					<Preview
						:comp="comp"
						:props="state.props"
						:handlers="handlers"
						:slots="state.slots"
						:classes="state.classes"
						:css="state.css"
						:variants="variants"
						:base="defaults.props"
						:width="width"
						:bg="bg" />
				</section>
				<div class="vcc-panel">
					<section class="vcc-card vcc-c-props">
						<h3>
							Props
							<button @click="reset">Reset</button>
						</h3>
						<PropControls v-model="state.props" :controls="controls" />
					</section>
					<section class="vcc-card vcc-c-slots">
						<h3>Slots</h3>
						<label v-for="(_, s) in state.slots" :key="s" class="vcc-field"
							><span>{{ s }}</span
							><input v-model="state.slots[s]"
						/></label>
					</section>
					<section class="vcc-card vcc-c-design">
						<h3>Design</h3>
						<label class="vcc-field"><span>classes</span><input v-model="state.classes" placeholder="rounded-full px-4" /></label>
						<label class="vcc-field"><span>css</span><textarea v-model="state.css" rows="3" placeholder="padding: 6px 14px;" /></label>
					</section>
					<section class="vcc-card vcc-c-events">
						<h3>Events</h3>
						<pre class="vcc-log">{{ log.join('\n') }}</pre>
					</section>
					<section class="vcc-card vcc-c-ai">
						<h3>Copy for AI</h3>
						<label class="vcc-field"><span>intent</span><textarea v-model="state.intent" rows="2" /></label>
						<pre class="vcc-log vcc-request">{{ request }}</pre>
						<button class="vcc-primary" @click="copy('req', request)">{{ copied === 'req' ? 'Copied' : 'Copy change request' }}</button>
						<button @click="copy('ex', buildExample(state.props, state.slots))">
							{{ copied === 'ex' ? 'Copied' : 'Copy as example' }}
						</button>
					</section>
				</div>
			</template>
		</main>
	</div>
</template>

<style>
	.vcc-app {
		--accent: #64748b;
		display: flex;
		height: 100vh;
		font:
			14px/1.4 system-ui,
			sans-serif;
		color: #0f172a;
		background: #f1f5f9;
	}
	:where(.vcc-app button, .vcc-app input, .vcc-app select, .vcc-app textarea):not(.vcc-canvas *) {
		font: inherit;
		color: inherit;
	}
	:where(.vcc-app button):not(.vcc-canvas *) {
		padding: 3px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 5px;
		background: #fff;
		cursor: pointer;
	}
	:where(.vcc-app button):not(.vcc-canvas *):hover {
		background: #f1f5f9;
	}
	:where(.vcc-app input:not([type='checkbox']), .vcc-app textarea, .vcc-app select):not(.vcc-canvas *) {
		padding: 4px 8px;
		border: 1px solid #cbd5e1;
		border-radius: 5px;
		background: #fff;
		box-sizing: border-box;
	}

	.vcc-side {
		width: 230px;
		flex: none;
		overflow: auto;
		padding: 12px 8px;
		background: #0f172a;
		color: #cbd5e1;
	}
	.vcc-brand {
		margin: 0 6px 12px;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.02em;
	}
	.vcc-side input {
		width: 100%;
		border-color: #334155 !important;
		background: #1e293b !important;
		color: #e2e8f0 !important;
	}
	.vcc-side h4 {
		margin: 16px 6px 4px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}
	.vcc-side a {
		display: block;
		padding: 4px 8px;
		color: inherit;
		text-decoration: none;
		border-radius: 5px;
	}
	.vcc-side a:hover {
		background: #1e293b;
	}
	.vcc-side a.active {
		background: #4f46e5;
		color: #fff;
	}

	.vcc-main {
		flex: 1;
		min-width: 0;
		overflow: auto;
		padding: 16px;
	}
	.vcc-empty {
		color: #64748b;
	}

	.vcc-stagecard {
		overflow: hidden;
		border: 1px solid #94a3b8;
		border-radius: 10px;
		background: #fff;
		box-shadow: 0 4px 16px rgb(15 23 42 / 0.12);
	}
	.vcc-bar {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 8px 12px;
		background: #1e293b;
		color: #e2e8f0;
	}
	.vcc-bar button {
		border-color: #475569;
		background: #334155;
		color: #e2e8f0;
	}
	.vcc-bar button:hover {
		background: #475569;
	}
	.vcc-bar button.on {
		border-color: #818cf8;
		background: #4f46e5;
		color: #fff;
	}
	.vcc-group {
		display: flex;
		gap: 2px;
	}
	.vcc-chip {
		margin-left: auto;
		font-size: 12px;
		color: #94a3b8;
	}
	.vcc-backdrop {
		padding: 16px;
		background: #94a3b8;
	}
	.vcc-canvas {
		box-sizing: border-box;
		max-width: 100%;
		min-height: 160px;
		margin: 0 auto;
		padding: 24px;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgb(15 23 42 / 0.25);
		transition: width 0.15s;
	}
	.vcc-bg-white {
		background: #fff;
	}
	.vcc-bg-grey {
		background: #e2e8f0;
	}
	.vcc-bg-checker {
		background: repeating-conic-gradient(#fff 0 25%, #e2e8f0 0 50%) 0 0 / 16px 16px;
	}
	.vcc-variant {
		margin-top: 16px;
		padding-top: 8px;
		border-top: 1px dashed #cbd5e1;
	}
	.vcc-variant small {
		color: #64748b;
	}
	.vcc-warn {
		margin: 0 0 8px;
		padding: 4px 8px;
		border-radius: 5px;
		color: #92400e;
		background: #fef3c7;
	}
	.vcc-err {
		color: #b91c1c;
		white-space: pre-wrap;
	}

	.vcc-panel {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
		gap: 12px;
		margin-top: 16px;
	}
	.vcc-card {
		padding: 0 12px 12px;
		border: 1px solid #e2e8f0;
		border-top: 3px solid var(--accent);
		border-radius: 8px;
		background: #fff;
	}
	.vcc-card h3 {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 0 -12px 10px;
		padding: 8px 12px;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, #fff);
	}
	.vcc-c-props {
		--accent: #2563eb;
	}
	.vcc-c-slots {
		--accent: #059669;
	}
	.vcc-c-design {
		--accent: #9333ea;
	}
	.vcc-c-events {
		--accent: #d97706;
	}
	.vcc-c-ai {
		--accent: #0d9488;
		grid-column: 1 / -1;
	}
	.vcc-primary {
		border-color: #0d9488 !important;
		background: #0d9488 !important;
		color: #fff !important;
	}
	.vcc-c-ai button {
		margin: 8px 6px 0 0;
	}
	.vcc-field {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		margin: 6px 0;
	}
	.vcc-field > span {
		width: 100px;
		flex: none;
		padding-top: 4px;
		color: #475569;
	}
	.vcc-field input:not([type='checkbox']),
	.vcc-field textarea,
	.vcc-field select {
		flex: 1;
		min-width: 0;
	}
	.vcc-log {
		min-height: 1.5em;
		max-height: 160px;
		margin: 0;
		padding: 8px;
		overflow: auto;
		border-radius: 5px;
		font:
			12px/1.4 ui-monospace,
			monospace;
		white-space: pre-wrap;
		background: #0f172a;
		color: #e2e8f0;
	}
</style>
