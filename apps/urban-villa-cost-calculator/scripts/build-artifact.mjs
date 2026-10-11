// Turn dist-artifact/ into one publishable page: artifact/index.html (page content only; the
// Artifact host adds the <!doctype>/<head>/<body> skeleton).
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist-artifact');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const jsRef = html.match(/<script[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/);
const cssRef = html.match(/<link[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/);
if (!jsRef) throw new Error('bundle script not found');
const js = fs.readFileSync(path.join(dist, jsRef[1]), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const css = cssRef ? fs.readFileSync(path.join(dist, cssRef[1]), 'utf8').replace(/<\/style/gi, '<\\/style') : '';
if (/url\((?!data:|["']?data:)/.test(css)) throw new Error('CSS still references external files');

const page = `<title>Urban Villa Cost Calculator</title>
<meta name="description" content="Urban Projects — Kuwait villa construction cost calculator (Arabic / English)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
fs.mkdirSync('artifact', { recursive: true });
fs.writeFileSync('artifact/index.html', page);
console.log(`artifact/index.html ${(Buffer.byteLength(page) / 1024).toFixed(0)} KB`);
