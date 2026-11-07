const QRCode = require('qrcode');

function renderQrSvg(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'Q' });
  const margin = 4;
  const size = qr.modules.size;
  const canvasSize = size + margin * 2;
  const modules = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const finder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      if (qr.modules.get(x, y) && !finder) modules.push(`M${x + margin} ${y + margin}h1v1h-1z`);
    }
  }

  const palette = ['#355f50', '#a34d42', '#806018'];
  const colorOffset = [...url].reduce((sum, character) => (sum + character.charCodeAt(0)) % palette.length, 0);
  const finderColors = palette.map((_, index) => palette[(index + colorOffset) % palette.length]);
  const finder = (x, y, color) => `<rect x="${x}" y="${y}" width="7" height="7" fill="${color}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${color}"/>`;
  const center = canvasSize / 2;
  const badgeSize = 10;
  const markSize = 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}">
    <rect width="${canvasSize}" height="${canvasSize}" fill="#fff"/>
    <path d="${modules.join('')}" fill="#171a13" shape-rendering="crispEdges"/>
    ${finder(margin, margin, finderColors[0])}${finder(size + margin - 7, margin, finderColors[1])}${finder(margin, size + margin - 7, finderColors[2])}
    <rect x="${center - badgeSize / 2}" y="${center - badgeSize / 2}" width="${badgeSize}" height="${badgeSize}" rx="2.2" fill="#fff"/>
    <g transform="translate(${center - markSize / 2} ${center - markSize / 2}) scale(${markSize / 64})">
      <g transform="translate(-1 2)">
        <path d="M13 50C3 44 2 32 8 26 3 16 10 8 21 11 25 1 39 1 44 11 56 7 64 18 57 27c8 12 0 25-12 27-9 5-22 4-32-4Z" fill="#ee9878"/>
        <ellipse cx="24" cy="29" rx="7" ry="10" fill="#fffaf1"/><ellipse cx="42" cy="27" rx="7" ry="10" fill="#fffaf1"/>
        <ellipse cx="26" cy="30" rx="2.5" ry="4.5" fill="#30342f"/><ellipse cx="44" cy="28" rx="2.5" ry="4.5" fill="#30342f"/>
        <path d="M18 53c10 5 22 5 32 1" fill="none" stroke="#3f7b7e" stroke-width="5" stroke-linecap="round"/>
        <path d="M18 53c10 5 22 5 32 1" fill="none" stroke="#3f7b7e" stroke-width="5" stroke-linecap="round"/>
      </g>
    </g>
  </svg>`;
}

module.exports = { renderQrSvg };
