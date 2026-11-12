// monster avatar dataset shared by the server generator and the browser renderer
// every visual part is drawn procedurally in avatar-art.js, no image files
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.AvatarTypes = data;
})(typeof self !== 'undefined' ? self : this, () => {
  // body colours match the game's player colours so dots, bars and avatars agree
  const palette = {
    coral: '#f39885', sky: '#94bafa', sand: '#e8ca76', moss: '#9dca8e', lilac: '#c8aae9',
    teal: '#8ad1cb', apricot: '#f4ae76', rose: '#ecabd0', slate: '#adbccf', olive: '#c4cb79',
  };
  const accents = {
    cream: '#fffaf1', plum: '#7d5a8c', forest: '#4f7a5a', brick: '#b4584a', navy: '#4a5f8a', mustard: '#c99a2e',
  };

  // shared trait pools, a type narrows them
  const shared = {
    eyeCount: [1, 2, 3],
    gaze: ['center', 'left', 'right', 'up', 'down'],
    mouth: ['smile', 'grin', 'fangs', 'open', 'flat', 'tongue', 'zigzag', 'tooth'],
    accessory: ['none', 'none', 'bowtie', 'scarf', 'tophat', 'flower', 'glasses', 'bandaid', 'necklace'],
    size: ['s', 'm', 'l'],
    tilt: [-6, -3, 0, 3, 6],
    nose: ['none', 'none', 'dot', 'button', 'triangle', 'snout', 'long', 'beak', 'pig'],
    brows: ['none', 'none', 'flat', 'raised', 'worried', 'unibrow', 'bushy'],
    cheeks: ['none', 'none', 'blush', 'whiskers', 'dimples', 'warpaint'],
    pupil: ['round', 'big', 'tiny', 'slit', 'heart'],
    iris: ['none', 'amber', 'green', 'blue', 'violet', 'red'],
    eyeSize: ['s', 'm', 'l'],
    eyeSpacing: ['close', 'normal', 'wide'],
    mouthWidth: ['narrow', 'normal', 'wide'],
    stretch: ['squat', 'normal', 'tall'],
  };
  const irises = { amber: '#d9962b', green: '#5f9e5a', blue: '#4f84c4', violet: '#8a62b8', red: '#c4524a' };

  const types = [
    {
      id: 'blob',
      name: { ru: 'Шлёп', en: 'Splodge', kk: 'Тамшы' },
      bodies: ['drop', 'round', 'bean'],
      colors: ['moss', 'teal', 'lilac', 'rose', 'sky', 'olive'],
      accents: ['cream', 'forest', 'plum'],
      eyes: ['round', 'stalk', 'dot', 'sleepy'],
      eyeCount: [1, 2, 3],
      tops: ['none', 'sprout', 'antenna', 'tuft'],
      features: ['none', 'arms', 'feet'],
      patterns: ['none', 'spots', 'belly', 'freckles'],
    },
    {
      id: 'furball',
      name: { ru: 'Пушок', en: 'Fuzzball', kk: 'Жүнді' },
      bodies: ['shaggy'],
      colors: ['apricot', 'sand', 'rose', 'lilac', 'slate', 'coral', 'sky'],
      accents: ['cream', 'plum', 'brick'],
      eyes: ['round', 'sleepy', 'dot'],
      eyeCount: [1, 2],
      tops: ['ears', 'tuft', 'horns', 'none'],
      features: ['feet', 'arms'],
      patterns: ['none', 'belly', 'freckles'],
    },
    {
      id: 'horned',
      name: { ru: 'Рогач', en: 'Hornbeast', kk: 'Мүйізді' },
      bodies: ['wide', 'box', 'round', 'tall'],
      colors: ['coral', 'slate', 'olive', 'apricot', 'lilac', 'sky', 'moss'],
      accents: ['cream', 'brick', 'mustard'],
      eyes: ['angry', 'round', 'dot'],
      eyeCount: [1, 2],
      tops: ['horns', 'ramhorns', 'antlers'],
      features: ['arms', 'feet', 'tail'],
      patterns: ['none', 'stripes', 'spots', 'belly'],
    },
    {
      id: 'ghost',
      name: { ru: 'Призрак', en: 'Boo', kk: 'Елес' },
      bodies: ['ghost'],
      colors: ['slate', 'lilac', 'sky', 'teal', 'rose'],
      accents: ['cream', 'navy', 'plum'],
      eyes: ['round', 'sleepy', 'dot'],
      eyeCount: [1, 2],
      tops: ['none', 'tuft'],
      features: ['none', 'arms'],
      patterns: ['none', 'freckles'],
    },
    {
      id: 'octo',
      name: { ru: 'Спрут', en: 'Squidge', kk: 'Сегізаяқ' },
      bodies: ['dome'],
      colors: ['coral', 'rose', 'lilac', 'teal', 'apricot', 'sky'],
      accents: ['cream', 'plum', 'navy'],
      eyes: ['round', 'sleepy', 'angry', 'stalk'],
      eyeCount: [1, 2, 3],
      tops: ['none', 'antenna', 'tuft'],
      features: ['tentacles'],
      featureCount: [3, 4, 5, 6],
      patterns: ['none', 'spots', 'freckles'],
    },
    {
      id: 'robot',
      name: { ru: 'Болтик', en: 'Bolt', kk: 'Робот' },
      bodies: ['box', 'tall', 'wide'],
      colors: ['slate', 'sky', 'teal', 'sand', 'olive', 'coral'],
      accents: ['navy', 'mustard', 'brick'],
      eyes: ['visor', 'round', 'dot'],
      eyeCount: [1, 2, 3],
      tops: ['antenna', 'propeller', 'bolt'],
      features: ['wheel', 'springs', 'arms'],
      patterns: ['rivets', 'stripes', 'none'],
    },
    {
      id: 'bug',
      name: { ru: 'Жук', en: 'Beetle', kk: 'Қоңыз' },
      bodies: ['oval', 'round', 'bean'],
      colors: ['moss', 'sand', 'teal', 'coral', 'olive', 'apricot'],
      accents: ['forest', 'navy', 'brick', 'cream'],
      eyes: ['round', 'dot', 'stalk'],
      eyeCount: [2, 3],
      tops: ['antennae'],
      features: ['legs', 'wings'],
      patterns: ['spots', 'stripes', 'none'],
    },
    {
      id: 'lizard',
      name: { ru: 'Ящер', en: 'Lizard', kk: 'Кесіртке' },
      bodies: ['bean', 'tall', 'wide'],
      colors: ['moss', 'olive', 'teal', 'sand', 'apricot', 'sky'],
      accents: ['forest', 'mustard', 'cream'],
      eyes: ['round', 'angry', 'sleepy'],
      eyeCount: [1, 2],
      tops: ['crest', 'horns', 'none'],
      features: ['tail', 'feet'],
      patterns: ['spots', 'belly', 'stripes'],
    },
  ];

  const adjectives = [
    { id: 'sleepy', ru: 'Сонный', en: 'Sleepy', kk: 'Ұйқышыл' },
    { id: 'cheerful', ru: 'Весёлый', en: 'Cheerful', kk: 'Көңілді' },
    { id: 'shy', ru: 'Робкий', en: 'Shy', kk: 'Ұялшақ' },
    { id: 'brave', ru: 'Храбрый', en: 'Brave', kk: 'Батыл' },
    { id: 'hungry', ru: 'Голодный', en: 'Hungry', kk: 'Аш' },
    { id: 'curious', ru: 'Любопытный', en: 'Curious', kk: 'Әуесқой' },
    { id: 'polite', ru: 'Вежливый', en: 'Polite', kk: 'Сыпайы' },
    { id: 'lazy', ru: 'Ленивый', en: 'Lazy', kk: 'Жалқау' },
    { id: 'sly', ru: 'Хитрый', en: 'Sly', kk: 'Қу' },
    { id: 'grand', ru: 'Важный', en: 'Grand', kk: 'Маңғаз' },
  ];

  // pairs that draw on top of each other
  const exclusions = [
    ['eyes:stalk', 'accessory:tophat'],
    ['eyes:stalk', 'accessory:glasses'],
    ['eyes:visor', 'accessory:glasses'],
    ['top:propeller', 'accessory:tophat'],
    ['top:antlers', 'accessory:tophat'],
    ['top:antennae', 'accessory:tophat'],
    ['body:dome', 'accessory:scarf'],
    ['body:dome', 'accessory:bowtie'],
    ['body:dome', 'accessory:necklace'],
    ['nose:long', 'accessory:glasses'],
    ['cheeks:whiskers', 'accessory:bandaid'],
  ];

  return { palette, accents, irises, shared, types, adjectives, exclusions };
});
