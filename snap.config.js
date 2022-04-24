module.exports = {
  cliOptions: {
    port: 8080,
  },
  bundlerCustomizer: (browserify) =>
    browserify.plugin('tsify', { noImplicitAny: true }),
};
