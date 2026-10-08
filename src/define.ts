import type {App, Component} from 'vue';

export interface CatalogExample {
	props?: Record<string, unknown>;
	/** default slot text */
	slot?: string;
	/** named slot text */
	slots?: Record<string, string>;
	/** rendered side by side, props layered over `props` */
	variants?: {name: string; props: Record<string, unknown>}[];
}

export const defineCatalog = (example: CatalogExample): CatalogExample => example;

/** `setup` default export: install plugins on the app; optionally return a `wrapper` component (renders its default slot) to provide context such as a TooltipProvider */
export type CatalogSetup = (_app: App) => void | {wrapper?: Component} | Promise<void | {wrapper?: Component}>;
