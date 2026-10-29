import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!url || !key || url.includes('placeholder')) {
  console.log('Supabase configuration unavailable');
  process.exit(0);
}

const client = createClient(url, key, { auth: { persistSession: false } });
const bucketId = 'lesson-materials';
const bucketOptions = {
  public: false,
  fileSizeLimit: 6 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'application/zip'],
};
if (process.argv.includes('--apply')) {
  const current = await client.storage.getBucket(bucketId);
  const result = current.error
    ? await client.storage.createBucket(bucketId, bucketOptions)
    : await client.storage.updateBucket(bucketId, bucketOptions);
  if (result.error) {
    console.error(`Bucket setup failed: ${result.error.message}`);
    process.exit(1);
  }
}
const [table, bucket] = await Promise.all([
  client.from('materials').select('id', { head: true, count: 'exact' }).limit(1),
  client.storage.getBucket(bucketId),
]);

console.log(JSON.stringify({
  materialsTable: table.error ? table.error.message : 'available',
  bucket: bucket.error ? bucket.error.message : {
    public: bucket.data.public,
    file_size_limit: bucket.data.file_size_limit,
  },
}));
