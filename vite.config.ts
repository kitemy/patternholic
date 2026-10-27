import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import {loadEnv} from 'vite'
import {resolve} from 'path'
import {localApi} from './server/vite-api'

export default defineConfig(({mode}) => ({
    plugins: [vue(), localApi(loadEnv(mode, process.cwd(), ''))],
    resolve: {alias: {'@': resolve(__dirname, 'src')}},
    build: {outDir: 'dist', emptyOutDir: true},
    test: {environment: 'node'}
}))
