import fs from 'fs';
import https from 'https';
import path from 'path';

const url = 'https://chaingpt-web.s3.us-east-2.amazonaws.com/assets/video/Labs/LABS_hero_CHROME_VP9.webm';
const dest = path.resolve('public', 'robo.webm');

console.log(`Downloading ${url} to ${dest}...`);

const file = fs.createWriteStream(dest);

https.get(url, (response) => {
  if (response.statusCode !== 200) {
      console.error(`Failed to download: Status Code ${response.statusCode}`);
      return;
  }
  
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✅ Download completed!');
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error(`❌ Error downloading file: ${err.message}`);
});
