const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/rss/fetch',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('Sending POST to http://localhost:3001/api/rss/fetch...');
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', parsed);
    } catch {
      console.log('Raw Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
