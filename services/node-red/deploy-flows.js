const http = require('http');
const fs = require('fs');

const FLOWS_FILE = '/default-flows.json';
const RETRY_INTERVAL = 1000;
const MAX_RETRIES = 30;

function waitForNodeRed(retries) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:1880/flows', (res) => {
      resolve();
    });
    req.on('error', () => {
      if (retries <= 0) {
        reject(new Error('Node-RED did not start in time'));
        return;
      }
      setTimeout(() => waitForNodeRed(retries - 1).then(resolve, reject), RETRY_INTERVAL);
    });
    req.end();
  });
}

function deployFlows() {
  return new Promise((resolve, reject) => {
    const flows = fs.readFileSync(FLOWS_FILE, 'utf8');
    const data = JSON.stringify(JSON.parse(flows));
    const options = {
      hostname: 'localhost',
      port: 1880,
      path: '/flows',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      console.log(`Deploy response: ${res.statusCode}`);
      resolve();
    });
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

waitForNodeRed(MAX_RETRIES)
  .then(() => {
    console.log('Node-RED is ready, deploying flows...');
    return deployFlows();
  })
  .then(() => {
    console.log('Flows deployed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Deploy failed:', err.message);
    process.exit(1);
  });
