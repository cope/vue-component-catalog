import {defineConfig} from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		testTimeout: 60000,
		environment: 'happy-dom',
		restoreMocks: true,
		setupFiles: ['./test/_setup/vitest.setup.ts'],
		reporters: ['verbose', 'junit'],
		include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
		outputFile: 'coverage/test-results.xml',
		coverage: {
			provider: 'v8',
			reportsDirectory: './coverage',
			reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
			include: ['src/**/*.vue', 'src/**/*.ts'],
			exclude: ['src/**/*.d.ts']
		}
	}
});
