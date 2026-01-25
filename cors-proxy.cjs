/**
 * Simple CORS proxy for development
 * Proxies requests to /api/cors-proxy?url=<encoded-url>
 */
module.exports = function corsProxy() {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/cors-proxy')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        try {
          const response = await fetch(targetUrl);
          const body = await response.text();
          const contentType = response.headers.get('content-type') || 'text/plain';

          res.statusCode = response.ok ? 200 : response.status;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Content-Type', contentType);
          res.end(body);
        } catch (err) {
          res.statusCode = 500;
          res.end(`Proxy error: ${err.message}`);
        }
      });
    },
  };
};
