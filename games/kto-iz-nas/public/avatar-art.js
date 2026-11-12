// draws a monster avatar from avatar-types.js traits as an svg string
(function (root, factory) {
  const data = typeof module === 'object' && module.exports ? require('./avatar-types') : root.AvatarTypes;
  const art = factory(data);
  if (typeof module === 'object' && module.exports) module.exports = art;
  else root.AvatarArt = art;
})(typeof self !== 'undefined' ? self : this, data => {
  const INK = '#30342f';
  const WHITE = '#fffaf1';
  const line = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

  function shaggyPath() {
    const points = [];
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 ? 33 : 39;
      points.push([60 + Math.cos(angle) * radius, 72 + Math.sin(angle) * radius * 0.95]);
    }
    return 'M' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
  }

  // top is the head crown, eye and mouth heights, half is the half width at eye level
  const bodies = {
    round: { d: 'M24 72a36 34 0 1 0 72 0a36 34 0 1 0-72 0Z', top: 38, eye: 64, mouth: 84, half: 30, arm: 80, bottom: 106 },
    tall: { d: 'M34 54a26 26 0 0 1 52 0v52H34Z', top: 28, eye: 52, mouth: 70, half: 22, arm: 78, bottom: 106 },
    wide: { d: 'M14 106V76a26 26 0 0 1 26-26h40a26 26 0 0 1 26 26v30Z', top: 50, eye: 70, mouth: 88, half: 36, arm: 88, bottom: 106 },
    drop: { d: 'M60 26C76 46 94 60 94 80a34 27 0 0 1-68 0c0-20 18-34 34-54Z', top: 30, eye: 72, mouth: 90, half: 26, arm: 88, bottom: 107 },
    bean: { d: 'M60 30c18 0 26 14 26 28 0 10 12 18 12 30 0 12-14 18-38 18s-38-6-38-18c0-12 12-20 12-30 0-14 8-28 26-28Z', top: 30, eye: 52, mouth: 70, half: 20, arm: 86, bottom: 106 },
    box: { d: 'M28 40h64a6 6 0 0 1 6 6v54a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V46a6 6 0 0 1 6-6Z', top: 40, eye: 62, mouth: 84, half: 30, arm: 82, bottom: 106 },
    ghost: { d: 'M28 106V66a32 32 0 0 1 64 0v40l-8-7-8 7-8-7-8 7-8-7-8 7-8-7Z', top: 34, eye: 62, mouth: 80, half: 26, arm: 78, bottom: 106 },
    dome: { d: 'M22 86a38 46 0 0 1 76 0q0 8-38 8t-38-8Z', top: 40, eye: 64, mouth: 80, half: 30, arm: 84, bottom: 94 },
    shaggy: { d: shaggyPath(), top: 34, eye: 66, mouth: 86, half: 28, arm: 82, bottom: 108 },
    oval: { d: 'M30 68a30 38 0 1 0 60 0a30 38 0 1 0-60 0Z', top: 30, eye: 54, mouth: 72, half: 24, arm: 80, bottom: 106 },
  };

  const sizes = { s: 0.84, m: 0.92, l: 1 };
  const eyeSizes = { s: 0.8, m: 1, l: 1.22 };
  const spacings = { close: 0.72, normal: 1, wide: 1.3 };
  const mouthWidths = { narrow: 0.65, normal: 1, wide: 1.35 };
  const stretches = { squat: [1.08, 0.9], normal: [1, 1], tall: [0.93, 1.08] };

  function mix(hex, other, amount) {
    const parse = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16));
    const [a, b] = [parse(hex), parse(other)];
    return '#' + a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount).toString(16).padStart(2, '0')).join('');
  }

  function prng(seed) {
    let state = (seed >>> 0) || 1;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2 ** 32; };
  }

  function eyePositions(shape, avatar) {
    const n = avatar.eyeCount;
    const y = avatar.eyes === 'stalk' ? shape.top - 14 : shape.eye;
    const radius = (n === 1 ? 11 : n === 2 ? 8.5 : 7) * (eyeSizes[avatar.eyeSize] ?? 1);
    // outer eyes stay on the face however wide they are set
    const widest = (shape.half + 4 - radius) * (n === 2 ? 2 : 1);
    const gap = n === 1 ? 0 : Math.min(shape.half * (n === 2 ? 0.72 : 0.62) * (spacings[avatar.eyeSpacing] ?? 1), widest);
    const xs = n === 1 ? [60] : n === 2 ? [60 - gap / 2, 60 + gap / 2] : [60 - gap, 60, 60 + gap];
    return xs.map((x, i) => ({ x, y: n === 3 && i === 1 ? y - 6 : y, r: radius }));
  }

  const gazeOffset = { center: [0, 0], left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

  function drawEyes(shape, avatar, fill) {
    if (avatar.eyes === 'visor') {
      const w = shape.half * 1.5;
      const [dx] = gazeOffset[avatar.gaze] ?? [0, 0];
      return `<rect x="${60 - w / 2}" y="${shape.eye - 8}" width="${w}" height="16" rx="8" fill="${INK}"/>`
        + `<rect x="${60 - 6 + dx * (w / 2 - 10)}" y="${shape.eye - 4}" width="12" height="8" rx="4" fill="#deef83"/>`;
    }
    const [gx, gy] = gazeOffset[avatar.gaze] ?? [0, 0];
    return eyePositions(shape, avatar).map(({ x, y, r }) => {
      let svg = '';
      if (avatar.eyes === 'stalk') svg += `<path d="M${x} ${y + r} L${(x + 60) / 2} ${shape.top + 8}" fill="none" ${line}/>`;
      if (avatar.eyes === 'dot') return svg + `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="${INK}"/>`;
      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${WHITE}" ${line}/>`;
      const px = x + gx * r * 0.4, py = y + gy * r * 0.4;
      const iris = data.irises?.[avatar.iris];
      if (iris) svg += `<circle cx="${px}" cy="${py}" r="${r * 0.62}" fill="${iris}"/>`;
      svg += drawPupil(avatar.pupil, px, py, r);
      if (avatar.eyes === 'sleepy') svg += `<path d="M${x - r - 1.5} ${y}a${r + 1.5} ${r + 1.5} 0 0 1 ${2 * r + 3} 0Z" fill="${fill}" ${line}/>`;
      if (avatar.eyes === 'angry') {
        // brows slope down toward the middle of the face
        const [outer, inner] = [y - r - 8, y - r];
        svg += x === 60
          ? `<path d="M${x - r} ${outer}L${x} ${inner}L${x + r} ${outer}" fill="none" ${line}/>`
          : `<path d="M${x - r} ${x < 60 ? outer : inner}L${x + r} ${x < 60 ? inner : outer}" fill="none" ${line}/>`;
      }
      return svg;
    }).join('');
  }

  function drawPupil(kind, x, y, r) {
    switch (kind) {
      case 'big': return `<circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="${INK}"/><circle cx="${x + r * 0.2}" cy="${y - r * 0.22}" r="${r * 0.17}" fill="${WHITE}"/>`;
      case 'tiny': return `<circle cx="${x}" cy="${y}" r="${r * 0.22}" fill="${INK}"/>`;
      case 'slit': return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.16}" ry="${r * 0.62}" fill="${INK}"/>`;
      case 'heart': {
        const h = r * 0.5;
        return `<path d="M${x} ${y + h}c-${h * 1.6}-${h} -${h * 1.1}-${h * 2.2} 0-${h * 1.2}c${h * 1.1}-${h} ${h * 1.6} ${h * 0.2} 0 ${h * 1.2}Z" fill="#d9475f"/>`;
      }
      default: return `<circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="${INK}"/>`;
    }
  }

  function drawBrows(shape, avatar, eyes) {
    if (['angry', 'stalk', 'dot'].includes(avatar.eyes) || !eyes.length) return '';
    const browLine = avatar.brows === 'bushy' ? `stroke="${INK}" stroke-width="5" stroke-linecap="round"` : line;
    if (avatar.brows === 'unibrow') {
      const first = eyes[0], last = eyes[eyes.length - 1];
      const y = Math.min(...eyes.map(e => e.y - e.r)) - 5;
      return `<path d="M${first.x - first.r} ${y + 2}q${(last.x + last.r - first.x + first.r) / 2} -6 ${last.x + last.r - first.x + first.r} 0" fill="none" ${browLine}/>`;
    }
    return eyes.map(({ x, y, r }) => {
      const top = y - r - 5;
      const side = x < 60 ? -1 : x > 60 ? 1 : 0;
      switch (avatar.brows) {
        case 'flat': case 'bushy': return `<path d="M${x - r * 0.8} ${top}h${r * 1.6}" fill="none" ${browLine}/>`;
        case 'raised': return `<path d="M${x - r * 0.8} ${top - 1}q${r * 0.8}-6 ${r * 1.6} 0" fill="none" ${browLine}/>`;
        case 'worried': return `<path d="M${x - r * 0.8} ${top + (side > 0 ? -4 : 2)}L${x + r * 0.8} ${top + (side < 0 ? -4 : side > 0 ? 2 : 2)}" fill="none" ${browLine}/>`;
        default: return '';
      }
    }).join('');
  }

  function drawNose(avatar, y, fill) {
    const shade = mix(fill, INK, 0.25);
    switch (avatar.nose) {
      case 'dot': return `<ellipse cx="60" cy="${y}" rx="2.6" ry="2" fill="${INK}"/>`;
      case 'button': return `<circle cx="60" cy="${y}" r="4.2" fill="${shade}" ${line} stroke-width="2"/>`;
      case 'triangle': return `<path d="M60 ${y - 4}l4.5 7h-9Z" fill="${shade}" ${line} stroke-width="2"/>`;
      case 'snout': return `<ellipse cx="60" cy="${y}" rx="8" ry="5" fill="${mix(fill, '#ffffff', 0.3)}" ${line} stroke-width="2"/><circle cx="57" cy="${y}" r="1.4" fill="${INK}"/><circle cx="63" cy="${y}" r="1.4" fill="${INK}"/>`;
      case 'long': return `<path d="M58 ${y - 6}c10 2 12 10 4 12-3 .7-4-1-3-3" fill="${shade}" ${line} stroke-width="2"/>`;
      case 'beak': return `<path d="M54 ${y - 3}h12l-6 8Z" fill="#e8b04f" ${line} stroke-width="2"/>`;
      case 'pig': return `<ellipse cx="60" cy="${y}" rx="6" ry="4.5" fill="#f2b8c6" ${line} stroke-width="2"/><ellipse cx="58" cy="${y}" rx="1" ry="1.6" fill="${INK}"/><ellipse cx="62" cy="${y}" rx="1" ry="1.6" fill="${INK}"/>`;
      default: return '';
    }
  }

  function drawCheeks(shape, avatar, y, accent) {
    const x = shape.half * 0.78;
    switch (avatar.cheeks) {
      case 'blush': return [-1, 1].map(side => `<ellipse cx="${60 + side * x}" cy="${y}" rx="5" ry="3" fill="#e88095" fill-opacity=".55"/>`).join('');
      case 'whiskers': return [-1, 1].map(side => [-3, 1, 5].map(dy => `<path d="M${60 + side * 9} ${y + dy / 2}l${side * 13} ${dy}" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`).join('')).join('');
      case 'dimples': return [-1, 1].map(side => `<path d="M${60 + side * (x - 4)} ${y + 2}q${side * 2} 3 0 5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`).join('');
      case 'warpaint': return [-1, 1].map(side => `<path d="M${60 + side * (x - 5)} ${y - 3}l${side * 6} 0M${60 + side * (x - 5)} ${y + 2}l${side * 6} 0" stroke="${accent === WHITE ? '#b4584a' : accent}" stroke-width="2.6" stroke-linecap="round"/>`).join('');
      default: return '';
    }
  }

  // nose sits under the lowest eye and pushes the mouth down when it needs room
  function faceLayout(shape, avatar, eyes) {
    const eyeBottom = avatar.eyes === 'stalk' || !eyes.length ? shape.eye + 8 : Math.max(...eyes.map(e => e.y + e.r));
    const noseY = Math.max(eyeBottom + 5, shape.eye + 8);
    const mouth = avatar.nose && avatar.nose !== 'none' ? Math.max(shape.mouth, noseY + 9) : shape.mouth;
    return { ...shape, mouth: Math.min(mouth, shape.bottom - 10), noseY, cheekY: Math.max(eyeBottom + 4, shape.eye + 10) };
  }

  function drawMouth(shape, avatar) {
    const y = shape.mouth;
    const w = Math.min(shape.half * 0.6, 16) * (mouthWidths[avatar.mouthWidth] ?? 1);
    const l = 60 - w, r = 60 + w;
    switch (avatar.mouth) {
      case 'grin': return `<path d="M${l} ${y - 2}h${2 * w}a${w} ${w * 0.8} 0 0 1-${2 * w} 0Z" fill="${INK}" ${line}/><path d="M${l + 3} ${y}h${2 * w - 6}" stroke="${WHITE}" stroke-width="3"/>`;
      case 'fangs': return `<path d="M${l} ${y}q${w} 8 ${2 * w} 0" fill="none" ${line}/><path d="M${60 - w * 0.55} ${y + 3}l3 7 3-6M${60 + w * 0.55} ${y + 3}l-3 7-3-6" fill="${WHITE}" ${line}/>`;
      case 'open': return `<ellipse cx="60" cy="${y + 2}" rx="${w * 0.5}" ry="${w * 0.42}" fill="${INK}"/>`;
      case 'flat': return `<path d="M${60 - w * 0.6} ${y + 1}h${w * 1.2}" fill="none" ${line}/>`;
      case 'tongue': return `<path d="M${60 - 2} ${y + 3}v6a5 5 0 0 0 10 0v-7" fill="#e88095" ${line}/><path d="M${l} ${y}q${w} 8 ${2 * w} 0" fill="none" ${line}/>`;
      case 'zigzag': return `<path d="M${l} ${y}l${w / 3} 4 ${w / 3}-4 ${w / 3} 4 ${w / 3}-4 ${w / 3} 4 ${w / 3}-4" fill="none" ${line}/>`;
      case 'tooth': return `<path d="M${l} ${y}q${w} 8 ${2 * w} 0" fill="none" ${line}/><rect x="57" y="${y + 3}" width="7" height="7" rx="1.5" fill="${WHITE}" ${line}/>`;
      default: return `<path d="M${l} ${y}q${w} 10 ${2 * w} 0" fill="none" ${line}/>`;
    }
  }

  function drawTop(shape, avatar, fill, accent) {
    const t = shape.top;
    const s = shape.half * 0.6;
    switch (avatar.top) {
      case 'horns': return `<path d="M${60 - s} ${t + 8}l-8-24 18 16Zm${2 * s} 0l8-24-18 16Z" fill="${WHITE}" ${line}/>`;
      case 'ramhorns': return `<path d="M${60 - s} ${t + 6}c-14-10-26 2-20 12s16 2 10-4" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M${60 + s} ${t + 6}c14-10 26 2 20 12s-16 2-10-4" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`;
      case 'antlers': return `<path d="M${60 - s} ${t + 6}l-6-22m3 10-10-6m7-4-2-10M${60 + s} ${t + 6}l6-22m-3 10 10-6m-7-4 2-10" fill="none" ${line} stroke="${accent === WHITE ? INK : accent}" stroke-width="4"/>`;
      case 'antenna': return `<path d="M60 ${t + 2}v-18" fill="none" ${line}/><circle cx="60" cy="${t - 19}" r="5" fill="${accent}" ${line}/>`;
      case 'antennae': return `<path d="M54 ${t + 4}c-4-12-10-16-16-18M66 ${t + 4}c4-12 10-16 16-18" fill="none" ${line}/><circle cx="37" cy="${t - 14}" r="4" fill="${accent}" ${line}/><circle cx="83" cy="${t - 14}" r="4" fill="${accent}" ${line}/>`;
      case 'sprout': return `<path d="M60 ${t + 2}v-14" fill="none" ${line}/><path d="M60 ${t - 10}c-4-8-14-8-16-4 4 6 12 6 16 4Zm0 0c4-8 14-8 16-4-4 6-12 6-16 4Z" fill="#9dca8e" ${line}/>`;
      case 'tuft': return `<path d="M54 ${t + 3}c-2-8 0-12 4-14M60 ${t + 2}c0-8 3-12 7-13M66 ${t + 4}c3-6 7-8 10-8" fill="none" ${line}/>`;
      case 'ears': return `<path d="M${60 - s - 6} ${t + 14}l2-24 16 12Zm${2 * s + 12} 0l-2-24-16 12Z" fill="${fill}" ${line}/>`;
      case 'propeller': return `<path d="M60 ${t}v-10" fill="none" ${line}/><path d="M60 ${t - 12}c-10-6-20-2-20 0s10 6 20 0c10-6 20-2 20 0s-10 6-20 0Z" fill="${accent}" ${line}/>`;
      case 'bolt': return `<rect x="54" y="${t - 10}" width="12" height="11" rx="2" fill="${mix(fill, INK, 0.25)}" ${line}/><path d="M56 ${t - 4}h8" ${line}/>`;
      case 'crest': return `<path d="M44 ${t + 6}l4-14 6 10 6-14 6 14 6-10 4 14Z" fill="${accent}" ${line}/>`;
      default: return '';
    }
  }

  function drawFeatureBack(shape, avatar, fill, accent) {
    const b = shape.bottom;
    switch (avatar.feature) {
      case 'tail': {
        // wide bodies tuck the tail in so it stays inside the frame
        const x = Math.min(60 + shape.half, 84);
        return `<path d="M${x} ${b - 14}c14 0 20-10 22-22 2 10-2 32-22 32Z" fill="${fill}" ${line}/>`;
      }
      case 'wings': return `<path d="M${60 - shape.half + 4} ${shape.eye + 6}c-22-18-34 2-28 16 4 8 18 6 28-4Zm${2 * shape.half - 8} 0c22-18 34 2 28 16-4 8-18 6-28-4Z" fill="${WHITE}" fill-opacity=".85" ${line}/>`;
      case 'legs': {
        let svg = '';
        for (const [i, dy] of [[0, -14], [1, -2], [2, 10]]) {
          const y = shape.arm + dy - 6;
          svg += `<path d="M${60 - shape.half + 4} ${y}l-14 ${4 + i * 2}l-4 6M${60 + shape.half - 4} ${y}l14 ${4 + i * 2}l4 6" fill="none" ${line}/>`;
        }
        return svg;
      }
      case 'tentacles': {
        const n = avatar.featureCount || 4;
        let svg = '';
        for (let i = 0; i < n; i++) {
          const x = 30 + (60 / (n - 1)) * i;
          const curl = i % 2 ? 6 : -6;
          svg += `<path d="M${x} ${b - 6}c0 8 ${curl} 10 ${curl} 16s${-curl} 4 ${-curl * 0.4} 0" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M${x} ${b - 6}c0 8 ${curl} 10 ${curl} 16s${-curl} 4 ${-curl * 0.4} 0" fill="none" stroke="${fill}" stroke-width="5" stroke-linecap="round"/>`;
        }
        return svg;
      }
      case 'wheel': return `<circle cx="60" cy="${b + 2}" r="9" fill="${INK}"/><circle cx="60" cy="${b + 2}" r="3.5" fill="${accent}"/>`;
      case 'springs': return `<path d="M46 ${b}l-5 3 10 3-10 3 10 3-5 2M74 ${b}l-5 3 10 3-10 3 10 3-5 2" fill="none" ${line}/>`;
      default: return '';
    }
  }

  function drawFeatureFront(shape, avatar, fill) {
    const b = shape.bottom;
    switch (avatar.feature) {
      case 'feet': return `<ellipse cx="46" cy="${b + 2}" rx="10" ry="6" fill="${mix(fill, INK, 0.12)}" ${line}/><ellipse cx="74" cy="${b + 2}" rx="10" ry="6" fill="${mix(fill, INK, 0.12)}" ${line}/>`;
      case 'arms': {
        const x = shape.half + (avatar.body === 'shaggy' ? 6 : 0);
        return `<path d="M${60 - x} ${shape.arm - 4}c-10 0-14 6-12 12" fill="none" ${line} stroke-width="3"/><path d="M${60 + x} ${shape.arm - 4}c10 0 14-8 12-14" fill="none" ${line} stroke-width="3"/>`;
      }
      default: return '';
    }
  }

  function drawPattern(shape, avatar, fill, accent, clip) {
    const random = prng(avatar.seed);
    const tone = mix(fill, INK, 0.18);
    let inner = '';
    switch (avatar.pattern) {
      case 'spots':
        for (let i = 0; i < 6; i++) inner += `<circle cx="${(26 + random() * 68).toFixed(1)}" cy="${(shape.mouth + 4 + random() * 22).toFixed(1)}" r="${(3 + random() * 4).toFixed(1)}" fill="${tone}"/>`;
        for (let i = 0; i < 2; i++) inner += `<circle cx="${(i ? 82 : 34) + random() * 6}" cy="${shape.top + 8 + random() * 6}" r="${2.5 + random() * 3}" fill="${tone}"/>`;
        break;
      case 'stripes':
        for (let y = shape.mouth + 10; y < shape.bottom + 4; y += 9) inner += `<rect x="0" y="${y}" width="120" height="4" fill="${tone}"/>`;
        break;
      case 'belly':
        inner = `<ellipse cx="60" cy="${shape.bottom - 6}" rx="${shape.half * 0.75}" ry="${(shape.bottom - shape.mouth) * 0.85}" fill="${mix(fill, '#ffffff', 0.45)}"/>`;
        break;
      case 'freckles': {
        const y = shape.eye + 12;
        const x = shape.half * 0.75;
        for (const side of [-1, 1]) for (const [dx, dy] of [[0, 0], [4, 3], [-3, 4]]) inner += `<circle cx="${60 + side * x + dx}" cy="${y + dy}" r="1.4" fill="${mix(fill, INK, 0.45)}"/>`;
        break;
      }
      case 'rivets':
        return [[28, 0], [92, 0]].map(([x]) => [shape.top + 8, shape.bottom - 8].map(y => `<circle cx="${x}" cy="${y}" r="2.4" fill="${mix(fill, INK, 0.4)}"/>`).join('')).join('');
      default: return '';
    }
    return `<g clip-path="url(#${clip})">${inner}</g>`;
  }

  function drawAccessory(shape, avatar, fill, accent, eyes) {
    const neck = Math.min(shape.mouth + 18, shape.bottom - 6);
    switch (avatar.accessory) {
      case 'bowtie': return `<path d="M60 ${neck}l-12-7v14Zm0 0 12-7v14Z" fill="${accent}" ${line}/><circle cx="60" cy="${neck}" r="3.5" fill="${accent}" ${line}/>`;
      case 'scarf': return `<path d="M${60 - shape.half - 2} ${neck - 4}q${shape.half + 2} 12 ${2 * shape.half + 4} 0v7q-${shape.half + 2} 12-${2 * shape.half + 4} 0Z" fill="${accent}" ${line}/><path d="M${60 + shape.half * 0.5} ${neck + 4}l4 16 8-2-4-15" fill="${accent}" ${line}/>`;
      case 'tophat': return `<path d="M44 ${shape.top + 2}h32M48 ${shape.top + 1}v-22h24v22Z" fill="${INK}" ${line}/><rect x="48" y="${shape.top - 8}" width="24" height="4" fill="${accent}"/>`;
      case 'flower': {
        const x = 60 + shape.half * 0.7, y = shape.top + 10;
        return [0, 72, 144, 216, 288].map(angle => `<circle cx="${(x + Math.cos(angle * Math.PI / 180) * 5).toFixed(1)}" cy="${(y + Math.sin(angle * Math.PI / 180) * 5).toFixed(1)}" r="4" fill="${WHITE}" ${line} stroke-width="2"/>`).join('') + `<circle cx="${x}" cy="${y}" r="3" fill="#e8ca76"/>`;
      }
      case 'glasses': {
        const lenses = eyes.map(({ x, y, r }) => `<circle cx="${x}" cy="${y}" r="${r + 3.5}" fill="none" ${line}/>`).join('');
        const bridges = eyes.slice(1).map(({ x, y, r }, i) => `<path d="M${eyes[i].x + eyes[i].r + 3.5} ${eyes[i].y}L${x - r - 3.5} ${y}" fill="none" ${line}/>`).join('');
        return lenses + bridges;
      }
      case 'bandaid': {
        const x = 60 - shape.half * 0.8, y = shape.mouth - 3;
        return `<g transform="rotate(-30 ${x} ${y})"><rect x="${x - 8}" y="${y - 3.5}" width="16" height="7" rx="3" fill="#f4d3a8" ${line} stroke-width="2"/></g>`;
      }
      case 'necklace': {
        let svg = '';
        for (let i = 0; i < 7; i++) svg += `<circle cx="${60 + (i - 3) * shape.half * 0.22}" cy="${neck - 4 + Math.abs(i - 3) * -1.6 + 6}" r="2.6" fill="${accent}" stroke="${INK}" stroke-width="1.5"/>`;
        return svg;
      }
      default: return '';
    }
  }

  let counter = 0;

  function avatarSvg(avatar, { label = '', className = '' } = {}) {
    if (!avatar || !bodies[avatar.body]) return '';
    const base = bodies[avatar.body];
    const fill = data.palette[avatar.color] ?? data.palette.coral;
    const accent = data.accents[avatar.accent] ?? data.accents.cream;
    const clip = `avatar-clip-${avatar.seed ?? 0}-${counter++}`;
    const k = sizes[avatar.size] ?? 1;
    const tilt = Number(avatar.tilt) || 0;
    const eyes = avatar.eyes === 'visor' ? [] : eyePositions(base, avatar);
    const shape = faceLayout(base, avatar, eyes);
    const [sx, sy] = stretches[avatar.stretch] ?? [1, 1];
    const safeLabel = String(label).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"${className ? ` class="${className}"` : ''}${safeLabel ? ` role="img" aria-label="${safeLabel}"` : ' aria-hidden="true"'}>`
      + `<defs><clipPath id="${clip}"><path d="${shape.d}"/></clipPath></defs>`
      + `<g transform="translate(60 114) scale(${k * sx} ${k * sy}) rotate(${tilt}) translate(-60 -114)">`
      + drawFeatureBack(shape, avatar, fill, accent)
      + drawTop(shape, avatar, fill, accent)
      + `<path d="${shape.d}" fill="${fill}" ${line}/>`
      + drawPattern(shape, avatar, fill, accent, clip)
      + drawFeatureFront(shape, avatar, fill)
      + drawCheeks(shape, avatar, shape.cheekY, accent)
      + drawEyes(shape, avatar, fill)
      + drawBrows(shape, avatar, eyes)
      + drawMouth(shape, avatar)
      + drawNose(avatar, shape.noseY, fill)
      + drawAccessory(shape, avatar, fill, accent, eyes)
      + '</g></svg>';
  }

  function avatarTitle(avatar, locale = 'ru') {
    const type = data.types.find(x => x.id === avatar?.type);
    const adjective = data.adjectives.find(x => x.id === avatar?.adjective);
    return [adjective?.[locale] ?? adjective?.ru, type?.name[locale] ?? type?.name.ru].filter(Boolean).join(' ');
  }

  return { avatarSvg, avatarTitle, bodies };
});
