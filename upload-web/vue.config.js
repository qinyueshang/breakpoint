module.exports = {
  devServer: {
    open: false, // 是否自动打开浏览器页面
    port: 8080, // 端口地址
    https: false, // 使用https提供服务

    // string | Object 代理设置
    proxy: {
      "/upload": {
        target: "http://localhost:3000",
        changeOrigin: true
        //pathRewrite: { '^/map': '' },
      }
    },
    progress: true,

    // 提供在服务器内部的其他中间件之前执行自定义中间件的能力
    before: app => {
      // `app` 是一个 express 实例
    }
  }
};
