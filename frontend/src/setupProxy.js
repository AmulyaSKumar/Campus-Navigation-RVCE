const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const proxyConfig = {
    target: 'http://127.0.0.1:5001',
    changeOrigin: true,
    logLevel: 'debug',
    onProxyReq(proxyReq, req) {
      console.log('[proxy] forwarding request', req.method, req.originalUrl);
    },
    onProxyRes(proxyRes, req) {
      console.log('[proxy] received response', proxyRes.statusCode, req.originalUrl);
    },
    onError(err, req, res) {
      console.error('[proxy] error', err.message);
      res.status(502).json({ error: 'Proxy failed', message: err.message });
    }
  };

  app.use('/api', createProxyMiddleware(proxyConfig));
  app.use('/chat', createProxyMiddleware(proxyConfig));
};
