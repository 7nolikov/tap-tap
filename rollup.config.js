import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
    input: 'app.js',
    output: {
        file: 'dist/app.bundle.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        terser()
    ]
}; 