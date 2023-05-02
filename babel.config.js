export default {
    sourceType: "module",
    presets: [
        '@babel/preset-typescript',
        ['@babel/preset-env', {targets: {node: 'current'}}],
    ],
};
