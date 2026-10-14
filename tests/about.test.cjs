const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'),'utf8');
const manifest = require('./about-manifest.json');
const hash = x => crypto.createHash('sha256').update(String(x).replace(/\r\n/g,'\n')).digest('hex');
test('one integrated About region preserves every original paragraph, recommendation, hub link and structured-data byte',()=>{
 assert.equal((html.match(/id="trontAbout"/g)||[]).length,1);
 assert.equal((html.match(/data-tront-discovery\s/g)||[]).length,1);
 for(const text of [manifest.bio,manifest.title,manifest.list,manifest.hub,manifest.jsonLd]) assert.ok(html.includes(text));
 assert.doesNotMatch(html, /class="tront-about"|<summary>About &middot; More by Tront/);
});
test('shared assets match the approved corrected revision exactly',()=>{
 assert.equal(hash(fs.readFileSync(path.join(root,'tront-about-discovery.js'))),manifest.javascriptSha256);
 assert.equal(hash(fs.readFileSync(path.join(root,'tront-about-discovery.css'))),manifest.cssSha256);
});
test('application scripts, original styles and media stay unchanged',()=>{
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('tront-about-discovery.js')&&!m[1].includes('application/ld+json')).map(m=>hash(m[0]));
 assert.deepEqual(scripts,manifest.scripts);
 const styles=[...html.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(m=>hash(m[0]));
 assert.deepEqual(styles,manifest.styles);
 assert.deepEqual([...html.matchAll(/<video\b[\s\S]*?<\/video>/gi)].map(m=>m[0]),manifest.videos);
});
test('no eager discovery media, preview controls, build disclaimers or global input handlers',()=>{
 const region=html.match(/<!-- tront-about:start -->[\s\S]*?<!-- tront-about:end -->/)[0];
 assert.doesNotMatch(region,/<(?:img|video|button)\b|\.mp4|earlier build|V16/i);
 const js=fs.readFileSync(path.join(root,'tront-about-discovery.js'),'utf8');
 assert.doesNotMatch(js,/createElement\(['"]button|archivalNote|earlier build|requestPointerLock|requestFullscreen|addEventListener\(['"]keydown/);
 assert.match(js,/image\.loading = 'lazy'/);
 assert.match(js,/id: 'smear'[\s\S]*?preview: null/);
 assert.match(js,/connection\.saveData/);
 assert.match(js,/var MAX_PREVIEWS = 3/);
 assert.match(js,/var RANDOM_COUNT = 2/);
 assert.doesNotMatch(html,/data-tront-discovery-status/);
 for(const attr of manifest.surfaceAttributes) assert.ok(html.includes(attr+' data-tront-discovery-game-surface'));
});
test('page-specific CSS is confined to the About host',()=>{
 const css=fs.readFileSync(path.join(root,'tront-about-page.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 for(const rule of css.split('}').filter(s=>s.trim())) assert.ok(rule.trim().startsWith('#trontAbout '));
});
