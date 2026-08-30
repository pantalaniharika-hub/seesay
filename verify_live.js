const fs = require('fs');

async function testLive() {
  const imagePath = 'C:\\Users\\panta\\.gemini\\antigravity-ide\\brain\\819fa395-8c84-4771-90e5-88e4d366b2fd\\red_cup_test_1788107519979.jpg';
  const imageBuffer = fs.readFileSync(imagePath);

  const authRes = await fetch('https://seesay-dun.vercel.app/auth/google', { redirect: 'manual' });
  const rawCookie = authRes.headers.get('set-cookie');

  const boundary = '----WebKitFormBoundaryTestLiveVerify';
  const part1 = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="sessionId"\r\n\r\n123456\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="red_cup.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  );
  const part2 = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullPayload = Buffer.concat([part1, imageBuffer, part2]);

  const res = await fetch('https://seesay-dun.vercel.app/api/describe', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Cookie': rawCookie ? rawCookie.split(';')[0] : ''
    },
    body: fullPayload
  });

  console.log('HTTP Status:', res.status);
  const json = await res.json();
  console.log('Result:', JSON.stringify(json, null, 2));
}

testLive().catch(console.error);
