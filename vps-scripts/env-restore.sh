#!/usr/bin/env bash
# Reconstroi /opt/manoelves/.env a partir do processo PM2 em execucao
pm2 jlist 2>/dev/null > /tmp/jlist.json
node << 'NODE'
const fs = require('fs');
const procs = JSON.parse(fs.readFileSync('/tmp/jlist.json', 'utf8'));
console.log('PROCESSOS:', procs.map(p => p.name).join(', '));
const proc = procs.find(p => p.pm2_env && (p.pm2_env.env && p.pm2_env.env.SUPABASE_SERVICE_ROLE_KEY));
if (!proc) { console.error('NAO-ACHEI-ENVS'); process.exit(1); }
const env = proc.pm2_env.env || {};
const names = Object.keys(env).sort();
console.log('=== TODOS OS NOMES DE ENV ===');
console.log(names.join('\n'));
const keep = names.filter(k =>
  k.startsWith('SUPABASE') || k.startsWith('VITE_') ||
  ['APP_URL', 'PORT', 'NITRO_PORT', 'INTERNAL_HOOKS_SECRET', 'OPENAI_API_KEY'].includes(k) ||
  /^(WAPI|UZAPI|MP_|MERCADO)/.test(k)
);
const lines = keep.map(k => k + '=' + env[k]).sort();
fs.writeFileSync('/opt/manoelves/.env', lines.join('\n') + '\n');
console.log('=== .env GERADO (nomes) ===');
console.log(lines.map(l => l.split('=')[0]).join('\n'));
console.log('LINHAS:', lines.length);
NODE
