const { randomInt } = require('crypto');
const AVATARS = require('./public/avatar-types');
const { avatarTitle } = require('./public/avatar-art');

const FACE = ['nose', 'brows', 'cheeks', 'pupil', 'iris', 'eyeSize', 'eyeSpacing', 'mouthWidth', 'stretch'];
const TRAITS = ['type', 'body', 'color', 'accent', 'eyes', 'eyeCount', 'gaze', 'mouth', 'top', 'feature', 'featureCount', 'pattern', 'accessory', 'size', 'tilt', ...FACE];
const secureRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

// traits that change the silhouette or face, tilt, gaze and size alone are too subtle
const LOOK = ['type', 'body', 'color', 'eyes', 'eyeCount', 'mouth', 'top', 'feature', 'featureCount', 'pattern', 'accessory', ...FACE];

function avatarKey(avatar, traits = TRAITS) {
  return traits.map(trait => avatar[trait]).join('|');
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

// picks randomly among the values used least often so far
function leastUsed(list, used, random) {
  const count = value => used.filter(x => x === value).length;
  const low = Math.min(...list.map(count));
  return pick(list.filter(value => count(value) === low), random);
}

function excluded(avatar) {
  return AVATARS.exclusions.some(pair => pair.every(rule => {
    const [trait, value] = rule.split(':');
    return String(avatar[trait]) === value;
  }));
}

function draft(taken, random) {
  // colour first: it doubles as the player colour, so spread it across the room
  const color = leastUsed(Object.keys(AVATARS.palette), taken.map(a => a.color), random);
  const fitting = AVATARS.types.filter(type => type.colors.includes(color));
  const typeId = leastUsed(fitting.map(type => type.id), taken.map(a => a.type), random);
  const type = AVATARS.types.find(x => x.id === typeId);
  const { shared } = AVATARS;
  const eyes = pick(type.eyes, random);
  return {
    type: type.id,
    body: pick(type.bodies, random),
    color,
    accent: pick(type.accents, random),
    eyes,
    eyeCount: eyes === 'visor' ? 1 : pick(type.eyeCount ?? shared.eyeCount, random),
    gaze: pick(shared.gaze, random),
    mouth: pick(type.mouths ?? shared.mouth, random),
    top: pick(type.tops, random),
    feature: pick(type.features, random),
    featureCount: type.featureCount ? pick(type.featureCount, random) : 0,
    pattern: pick(type.patterns, random),
    accessory: pick(type.accessories ?? shared.accessory, random),
    size: pick(shared.size, random),
    tilt: pick(shared.tilt, random),
    ...Object.fromEntries(FACE.map(trait => [trait, pick(type[trait] ?? shared[trait], random)])),
    seed: Math.floor(random() * 1e9),
    adjective: leastUsed(AVATARS.adjectives.map(a => a.id), taken.map(a => a.adjective), random),
  };
}

// returns an avatar whose visible traits differ from every avatar in taken
function generateAvatar({ taken = [], random = secureRandom, attempts = 500 } = {}) {
  const others = taken.filter(Boolean);
  const keys = new Set(others.map(avatar => avatarKey(avatar)));
  const looks = new Set(others.map(avatar => avatarKey(avatar, LOOK)));
  for (let i = 0; i < attempts; i++) {
    const avatar = draft(others, random);
    if (excluded(avatar) || keys.has(avatarKey(avatar))) continue;
    // late in a crowded room accept a twin that differs only in subtle traits
    if (!looks.has(avatarKey(avatar, LOOK)) || i >= attempts / 2) return avatar;
  }
  throw new Error('no unique avatar left');
}

module.exports = { generateAvatar, avatarKey, avatarTitle, TRAITS, LOOK, AVATARS };
