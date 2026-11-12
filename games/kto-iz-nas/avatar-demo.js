// writes a page with a room full of random avatars: node avatar-demo.js [count] [out.html]
const fs = require('fs');
const path = require('path');
const { generateAvatar, avatarTitle } = require('./avatar');
const { avatarSvg } = require('./public/avatar-art');

const count = Number(process.argv[2]) || 24;
const out = path.resolve(process.argv[3] || path.join(require('os').tmpdir(), 'avatar-demo.html'));
const room = [];
for (let i = 0; i < count; i++) room.push(generateAvatar({ taken: room }));

const cards = room.map(avatar => `<figure>${avatarSvg(avatar, { label: avatarTitle(avatar) })}<figcaption>${avatarTitle(avatar)}<small>${avatar.type} · ${avatar.body} · ${avatar.color}</small></figcaption></figure>`).join('\n');
fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Avatars</title>
<style>body{margin:0;padding:24px;background:#f9f8f4;color:#30342f;font:600 14px system-ui}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
figure{margin:0;padding:10px;background:#fff;border:1px solid #dfe2d9;border-radius:14px;text-align:center}svg{width:100%;height:auto}figcaption{display:grid;gap:2px}small{color:#686d64;font-weight:500}</style>
<h1>${count} players, ${count} monsters</h1><main>${cards}</main>`);
console.log(out);
