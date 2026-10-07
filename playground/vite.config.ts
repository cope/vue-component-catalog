import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import componentCatalog from '../src/index.ts';

export default defineConfig({
	resolve: {alias: {'vue-component-catalog/define': fileURLToPath(new URL('../src/define.ts', import.meta.url))}},
	plugins: [vue(), tailwindcss(), componentCatalog({themeCss: 'src/style.css', setup: 'src/catalog.setup.ts'})]
});
