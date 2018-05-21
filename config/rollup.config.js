import nodeResolve from 'rollup-plugin-node-resolve';
import alias from 'rollup-plugin-alias';
import path from "path";

function resolve(dir) {
    return path.join(__dirname, dir);
}

export default {
    input: './temp/everGis.js',
    cache: false,
    output: {
        file: './dist/everGis_bundle.js',
        format: 'umd',
        name: 'sGis',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        alias({
            resolve: [".js"],
            "sgis": resolve("../node_modules/sgis/dist"),
        }),
    ]
}