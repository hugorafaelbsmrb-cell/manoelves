#!/bin/bash
echo "=== @img sharp packages ==="
ls /opt/manoelves/node_modules/@img/ | grep sharp
echo "=== sharp.mjs bundle existe? ==="
ls -la /opt/manoelves/.output/server/_libs/sharp.mjs
echo "=== teste do bundle empacotado ==="
cd /opt/manoelves
node -e "import('./.output/server/_libs/sharp.mjs').then(m => { const s = m.default || m; return s({create:{width:64,height:64,channels:3,background:{r:10,g:10,b:20}}}).png().toBuffer(); }).then(b => console.log('SHARP-BUNDLE-OK', b.length)).catch(e => { console.error('SHARP-ERR:', e.message); process.exit(1); })"
echo "=== teste de composicao com a logo (simula composeCampaignLogo) ==="
node -e "import('sharp').then(async ({default: sharp}) => { const logo = await sharp('/opt/manoelves/src/assets/manoelves-logo.png').resize({width:220}).png().toBuffer(); const meta = await sharp(logo).metadata(); const out = await sharp({create:{width:1024,height:1024,channels:3,background:{r:20,g:20,b:30}}}).composite([{input:logo, top:1024-(meta.height||0)-28, left:1024-(meta.width||0)-28}]).png().toBuffer(); console.log('COMPOSE-OK', out.length, 'logo', meta.width+'x'+meta.height); }).catch(e => { console.error('COMPOSE-ERR:', e.message); process.exit(1); })"
echo "DONE"
