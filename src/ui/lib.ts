export interface PropInfo {
	name: string;
	/** TS type text, e.g. `'a' | 'b'`, `string`, `number[]` */
	type: string;
	required?: boolean;
	/** default as source text (from vue-component-meta) */
	default?: string;
}

export type Control = {kind: 'select'; name: string; options: string[]; required: boolean} | {kind: 'text' | 'number' | 'checkbox' | 'json'; name: string; required: boolean};

const LITERAL = /^(['"`])[^'"`]*\1$/;

/** descriptor per prop; functions are skipped */
export function propControls(props: PropInfo[]): Control[] {
	const out: Control[] = [];
	for (const {name, type, required = false} of props) {
		const parts = type.split('|').map((s) => s.trim());
		if (/=>|Function/.test(type)) continue;
		if (parts.length > 1 && parts.every((p) => LITERAL.test(p))) out.push({kind: 'select', name, required, options: parts.map((p) => p.slice(1, -1))});
		else if (type === 'string') out.push({kind: 'text', name, required});
		else if (type === 'number') out.push({kind: 'number', name, required});
		else if (type === 'boolean') out.push({kind: 'checkbox', name, required});
		else out.push({kind: 'json', name, required});
	}
	return out;
}

/** meta default source text -> value; undefined when not a plain literal */
export function parseDefault(src?: string): unknown {
	if (src === undefined) return undefined;
	try {
		return JSON.parse(src);
	} catch {
		return LITERAL.test(src) ? src.slice(1, -1) : undefined;
	}
}

const PLACEHOLDERS: Record<string, unknown> = {text: 'text', number: 0, checkbox: false};
const placeholder = (c: Control): unknown => (c.kind === 'select' ? c.options[0] : (PLACEHOLDERS[c.kind] ?? {}));

/** initial prop values: placeholder for required, then declared defaults, then example */
export function seedProps(props: PropInfo[], example: Record<string, unknown> = {}): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const c of propControls(props)) {
		const d = parseDefault(props.find((p) => p.name === c.name)!.default);
		if (d !== undefined) out[c.name] = d;
		else if (c.required) out[c.name] = placeholder(c);
	}
	return {...out, ...example};
}

/** runtime `Comp.props` -> PropInfo[] (fallback when vue-component-meta is unavailable) */
export function runtimeProps(defs: unknown): PropInfo[] {
	const names: Record<string, any> = Array.isArray(defs) ? Object.fromEntries(defs.map((n) => [n, null])) : ((defs as any) ?? {});
	return Object.entries(names).map(([name, d]) => {
		const t = [d?.type ?? d]
			.flat()
			.filter(Boolean)
			.map((f: any) => f?.name?.toLowerCase?.());
		return {
			name,
			type: t.length === 1 && ['string', 'number', 'boolean'].includes(t[0]) ? t[0] : 'object',
			required: !!d?.required
		};
	});
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface ChangeState {
	component: string;
	props: Record<string, unknown>;
	slots: Record<string, string>;
	classes: string;
	css: string;
	intent: string;
}

/** only sections that differ from `defaults` */
export function buildChangeRequest(s: ChangeState, defaults: Pick<ChangeState, 'props' | 'slots'>): string {
	const lines = [`Component: ${s.component}`];
	const props = Object.fromEntries(Object.entries(s.props).filter(([k, v]) => !same(v, defaults.props[k])));
	if (Object.keys(props).length) lines.push(`Props: ${JSON.stringify(props)}`);
	for (const [k, v] of Object.entries(s.slots)) if (v !== (defaults.slots[k] ?? '')) lines.push(`Slot (${k}): ${JSON.stringify(v)}`);
	if (s.classes.trim()) lines.push(`Added classes: ${s.classes.trim()}`);
	if (s.css.trim()) lines.push('CSS:', '```css', s.css.trim(), '```');
	if (s.intent.trim()) lines.push(`Intent: ${s.intent.trim()}`);
	return lines.join('\n');
}

/** body for a `Foo.catalog.ts` from current state */
export function buildExample(props: Record<string, unknown>, slots: Record<string, string>): string {
	const {default: slot, ...named} = Object.fromEntries(Object.entries(slots).filter(([, v]) => v));
	const body = [`props: ${JSON.stringify(props)}`, slot && `slot: ${JSON.stringify(slot)}`, Object.keys(named).length && `slots: ${JSON.stringify(named)}`].filter(Boolean);
	return `import {defineCatalog} from 'vue-component-catalog/define';\n\nexport default defineCatalog({\n\t${body.join(',\n\t')}\n});\n`;
}

/** common leading directory of all keys, e.g. `/src/components/` */
export function commonDir(keys: string[]): string {
	if (!keys.length) return '';
	const dirs = keys.map((k) => k.slice(0, k.lastIndexOf('/')).split('/'));
	let n = dirs[0].length;
	for (const d of dirs) while (n && dirs[0].slice(0, n).join('/') !== d.slice(0, n).join('/')) n--;
	return dirs[0].slice(0, n).join('/') + '/';
}

export async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		const ta = Object.assign(document.createElement('textarea'), {value: text});
		document.body.append(ta);
		ta.select();
		// eslint-disable-next-line sonarjs/deprecation -- only path that works in non-secure contexts (LAN IP)
		document.execCommand('copy');
		ta.remove();
	}
}
