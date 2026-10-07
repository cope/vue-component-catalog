import {rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expect, it} from 'vitest';
import {build, createServer} from 'vite';

const root = resolve(import.meta.dirname, '../playground');
const configFile = resolve(root, 'vite.config.ts');

it('serves catalog page, entry and meta', async () => {
	const server = await createServer({root, configFile, server: {port: 0}, logLevel: 'silent'});
	await server.listen();
	const base = server.resolvedUrls!.local[0];
	try {
		const html = await (await fetch(`${base}__catalog`)).text();
		expect(html).toContain('__x00__virtual:vue-component-catalog/entry');
		const entry = await server.pluginContainer.load('\0virtual:vue-component-catalog/entry');
		expect(JSON.stringify(entry)).toContain('/src/components/**/*.vue');
		expect(JSON.stringify(entry)).toContain('/src/components/**/*.catalog.{ts,js}');
		const meta = await (await fetch(`${base}__catalog/meta?file=/src/components/Button.vue`)).json();
		expect(meta.props.find((p: any) => p.name === 'variant').type).toMatch(/^.primary. \| .ghost. \| .danger.$/);
		expect(meta.events).toContain('click');
		expect(meta.slots).toContain('default');
		for (const bad of ['../package.json', '/../../etc/passwd', 'src/components/x.ts', '']) {
			expect((await fetch(`${base}__catalog/meta?file=${encodeURIComponent(bad)}`)).status).toBe(400);
		}
	} finally {
		await server.close();
	}
}, 60000);

it('meta follows component create, edit and delete', async () => {
	const server = await createServer({root, configFile, server: {port: 0}, logLevel: 'silent'});
	await server.listen();
	const base = server.resolvedUrls!.local[0];
	const file = resolve(root, 'src/components/Tmp.vue');
	const meta = async () => {
		const r = await fetch(`${base}__catalog/meta?file=src/components/Tmp.vue`);
		return {status: r.status, props: r.ok ? ((await r.json()).props as {name: string}[]).map((p) => p.name) : []};
	};
	const until = async (cond: () => Promise<boolean>) => {
		for (let i = 0; i < 40 && !(await cond()); i++) await new Promise((r) => setTimeout(r, 100));
		return cond();
	};
	try {
		writeFileSync(file, '<script setup lang="ts">defineProps<{a?: string}>();</script><template><i /></template>');
		expect(await until(async () => (await meta()).props.join() === 'a')).toBe(true);
		writeFileSync(file, '<script setup lang="ts">defineProps<{b?: string}>();</script><template><i /></template>');
		expect(await until(async () => (await meta()).props.join() === 'b')).toBe(true);
		rmSync(file);
		expect(await until(async () => (await meta()).status !== 200)).toBe(true);
	} finally {
		rmSync(file, {force: true});
		await server.close();
	}
}, 60000);

it('vite build has no catalog code', async () => {
	const out: any = await build({root, configFile, logLevel: 'silent', build: {write: false}});
	const code = out.output.map((o: any) => o.code ?? '').join('');
	expect(code).not.toContain('vue-component-catalog');
	expect(code).not.toContain('__catalog');
}, 60000);
