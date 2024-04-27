module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        // 指定 ES 版本为 ES5
        esmodules: false, // 关闭 ES6+ 模块语法的转换优化
        browsers: ['ie 11'] // 或者直接指定 "ie 11" 来确保向后兼容到 Internet Explorer 11
      },
      useBuiltIns: 'usage',
      corejs: 3
    }]
  ]
};
