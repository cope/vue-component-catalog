import {resolve} from 'node:path';
import {expect, it} from 'vitest';
import {build, createServer} from 'vite';

const root = resolve(import.meta.dirname, '../playground');
const configFile = resolve(root, 'vite.config.ts');

it('serves catalog page, entry and meta', async () => {
	const server = await createServer({root, configFile, server: {port: 5199}, logLevel: 'silent'});
	await server.listen();
	try {
		const html = await (await fetch('http://localhost:5199/__catalog')).text();
		expect(html).toContain('__x00__virtual:vue-component-catalog/entry');
		const entry = await server.pluginContainer.load('\0virtual:vue-component-catalog/entry');
		expect(JSON.stringify(entry)).toContain('/src/components/**/*.vue');
		expect(JSON.stringify(entry)).toContain('/src/components/**/*.catalog.{ts,js}');
		const meta = await (await fetch('http://localhost:5199/__catalog/meta?file=/src/components/Button.vue')).json();
		expect(meta.props.find((p: any) => p.name === 'variant').type).toMatch(/^.primary. \| .ghost. \| .danger.$/);
		expect(meta.events).toContain('click');
		expect(meta.slots).toContain('default');
	} finally {
		await server.close();
	}
}, 60000);

it('vite build has no catalog code', async () => {
	const out: any = await build({root, configFile, logLevel: 'silent', build: {write: false}});
	const code = out.output.map((o: any) => o.code ?? '').join('');
	expect(code).not.toContain('vue-component-catalog');
	expect(code).not.toContain('__catalog');
}, 60000);
