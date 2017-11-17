import resolve from 'rollup-plugin-node-resolve';

export default {
    input: './temp/everGis.js',
    cache: false,
    output: {
        file: './dist/everGis_bundle.js',
        format: 'umd',
        name: 'sGis',
        sourcemap: true
    },
    plugins: [resolve()]
}