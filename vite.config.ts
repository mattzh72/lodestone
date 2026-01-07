import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: 'dist',
		lib: {
			entry: 'src/index.ts',
			formats: ['umd'],
			fileName: 'lodestone',
			name: 'Lodestone',
		},
		rollupOptions: {
			external: ['three'],
			output: {
				globals: {
					three: 'THREE',
				},
			},
		},
	},
})
