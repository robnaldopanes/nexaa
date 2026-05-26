const http = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;
const dir = path.join(__dirname);

const app = next({ dev, hostname, port, dir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
