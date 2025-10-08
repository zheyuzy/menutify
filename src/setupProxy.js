const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('Proxy setup file loaded!');
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8888',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix when forwarding
      },
    })
  );
};
