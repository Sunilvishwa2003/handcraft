const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const token = jwt.sign(
  { id: '69ee02a2d9a085f3ba5ad4c6' },
  process.env.JWT_SECRET || 'dev-secret-change-me',
  { expiresIn: '1h' }
);

const filePath = path.join(process.cwd(), 'test-upload.png');
const base64Payload = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAuwB9pJ+bQAAAABJRU5ErkJggg==';
fs.writeFileSync(filePath, Buffer.from(base64Payload, 'base64'));

async function run() {
  const form = new FormData();
  form.append('assets', new Blob([fs.readFileSync(filePath)], { type: 'image/png' }), 'test-upload.png');
  const response = await fetch('http://localhost:5001/api/admin/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  console.log('status', response.status);
  console.log(await response.text());
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
