#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

// Load environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Minimal test PDF (base64)
const testPdf = Buffer.from('JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCA3MDAgVGQKKFRlc3QgUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDc0IDAwMDAwIG4gCjAwMDAwMDAxNTEgMDAwMDAgbiAKMDAwMDAwMDI3OSAwMDAwMCBuIAowMDAwMDAwMzc3IDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDcwCiUlRU9G', 'base64');

console.log('🧪 Testing end-to-end upload flow...\n');
console.log(`Supabase URL: ${SUPABASE_URL}`);

// Step 1: Upload to storage
async function uploadToStorage() {
    console.log('\n📤 Step 1: Upload PDF to Supabase Storage...');
    
    const url = new URL(`${SUPABASE_URL}/storage/v1/object/pdfs/test-${Date.now()}.pdf`);
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/pdf',
                'Content-Length': testPdf.length
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log(`✅ Uploaded: ${result.Key}`);
                    resolve(result.Key);
                } else {
                    console.error(`❌ Upload failed (${res.statusCode}): ${data}`);
                    reject(new Error(data));
                }
            });
        });
        
        req.on('error', reject);
        req.write(testPdf);
        req.end();
    });
}

// Step 2: Trigger Edge Function
async function triggerParsing(storagePath) {
    console.log('\n⚙️  Step 2: Trigger parse-pdf Edge Function...');
    
    const url = new URL(`${SUPABASE_URL}/functions/v1/parse-pdf`);
    const payload = JSON.stringify({
        bucket: 'pdfs',
        path: storagePath.replace('pdfs/', ''),
        title: 'Test PDF'
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Response status: ${res.statusCode}`);
                
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log(`✅ Parsed successfully!`);
                    console.log(`   Document ID: ${result.document_id}`);
                    console.log(`   Chunks: ${result.chunks_processed}`);
                    resolve(result);
                } else {
                    console.error(`❌ Parsing failed (${res.statusCode}):`);
                    console.error(data);
                    reject(new Error(data));
                }
            });
        });
        
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// Run the test
(async () => {
    try {
        const storagePath = await uploadToStorage();
        const result = await triggerParsing(storagePath);
        
        console.log('\n🎉 Success! Full flow working.');
        console.log(`\n🔍 Test search at: http://localhost:3001/search/${result.document_id}`);
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
})();
