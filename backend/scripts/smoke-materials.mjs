import { createClient } from '@supabase/supabase-js';
import { MaterialsService } from '../dist/modules/courses/materials.service.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) throw new Error('Supabase configuration unavailable');
const client = createClient(url, key, { auth: { persistSession: false } });
const { data: lessons, error: lessonError } = await client.from('lessons').select('id').limit(1);
if (lessonError) throw lessonError;
if (!lessons?.length) {
  console.log('SKIP: no lesson available for smoke test');
  process.exit(0);
}

const service = new MaterialsService({ getClient: () => client });
const lessonId = lessons[0].id;
const materialIds = [];
try {
  try {
    await service.upload(lessonId, {
      originalname: 'fake.pdf', mimetype: 'application/pdf', size: 5, buffer: Buffer.from('hello'),
    });
    throw new Error('Invalid PDF was accepted');
  } catch (error) {
    if (error.message === 'Invalid PDF was accepted') throw error;
  }
  const files = [
    { originalname: 'smoke-test.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') },
    { originalname: 'smoke-test.png', mimetype: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/X9kAAAAASUVORK5CYII=', 'base64') },
    { originalname: 'smoke-test.cs', mimetype: 'text/plain', buffer: Buffer.from('// temporary materials smoke test\n') },
  ];
  for (const file of files) {
    const created = await service.upload(lessonId, { ...file, size: file.buffer.length });
    materialIds.push(created.id);
  }
  const listed = await service.listForLesson(lessonId);
  if (!materialIds.every((id) => listed.some((item) => item.id === id))) throw new Error('Uploaded materials missing from list');
  const access = await service.access(materialIds[0]);
  if (!access.url) throw new Error('Signed URL missing');
  const renamed = await service.rename(materialIds[2], 'Smoke test code sample');
  if (renamed.title !== 'Smoke test code sample') throw new Error('Rename failed');
  console.log('PASS: validation, PDF/image/code upload, list, signed URL, rename');
} finally {
  for (const id of materialIds) await service.remove(id);
  if (materialIds.length) console.log('PASS: cleanup');
}
