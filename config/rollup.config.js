export default {
    input: './temp/everGis.js',
    output: {
        file: './dist/everGis.js',
        format: 'umd',
        name: 'sGis',
        sourcemap: true
    },
    external: name => {
        if (name.search('sgis') >= 0) console.error(new Error(name));
        return name.search('sgis') >= 0;
    }
}