const https = require('https');

https.get('https://stitch.google.com/dashboard/p/13353195984286325445/screens/91f71ffc37d94817bdbaca0e1a1487bb/raw', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data); });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
