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
