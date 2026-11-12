const test = require('node:test');
const assert = require('node:assert');
const { generateAvatar, avatarKey, AVATARS, LOOK } = require('../avatar');
const { avatarSvg, avatarTitle, bodies } = require('../public/avatar-art');

test('a full room of 50 players gets 50 different avatars', () => {
  const room = [];
  for (let i = 0; i < 50; i++) room.push(generateAvatar({ taken: room }));
  assert.strictEqual(new Set(room.map(avatar => avatarKey(avatar))).size, 50);
});

test('the first ten players get ten different colours', () => {
  const room = [];
  for (let i = 0; i < 10; i++) room.push(generateAvatar({ taken: room }));
  assert.strictEqual(new Set(room.map(avatar => avatar.color)).size, 10);
});

test('a new avatar never repeats one already in the room', () => {
  // a random source with two values keeps proposing the same few monsters
  let step = 0;
  const poor = () => (step++ % 3 ? 0 : 0.5);
  const room = [];
  assert.throws(() => { for (;;) room.push(generateAvatar({ taken: room, random: poor, attempts: 30 })); }, /no unique avatar/);
  assert.ok(room.length > 1);
  assert.strictEqual(new Set(room.map(avatar => avatarKey(avatar))).size, room.length);
});

test('every trait comes from the dataset and draws', () => {
  for (let i = 0; i < 300; i++) {
    const avatar = generateAvatar();
    const type = AVATARS.types.find(x => x.id === avatar.type);
    assert.ok(type.bodies.includes(avatar.body) && bodies[avatar.body]);
    assert.ok(type.colors.includes(avatar.color));
    assert.ok(type.tops.includes(avatar.top) && type.features.includes(avatar.feature));
    const svg = avatarSvg(avatar);
    assert.match(svg, /^<svg[^>]*>.*<\/svg>$/s);
    assert.doesNotMatch(svg, /NaN|undefined/);
    assert.ok(avatarTitle(avatar).includes(type.name.ru));
  }
});

test('ten thousand random monsters almost never share a look', () => {
  const looks = new Set();
  for (let i = 0; i < 10000; i++) looks.add(avatarKey(generateAvatar(), LOOK));
  assert.ok(looks.size > 9990, `only ${looks.size} distinct looks`);
});
