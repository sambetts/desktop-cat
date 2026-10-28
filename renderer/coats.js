// Cat coats: the built-in gallery, plus validation for cats people build, import and share.
// Loaded by the main process (require) and by renderers (<script>), so keep it dependency-free.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.catCoats = api;
})(typeof self !== 'undefined' ? self : this, () => {
  const FORMAT = 'desktop-cat.coat', VERSION = 1;
  // Palette slots in builder order; `key` is the letter used in the sprite art.
  const slots = [
    { name: 'fur', key: 'g', label: 'Fur' },
    { name: 'shade', key: 'o', label: 'Shading' },
    { name: 'markings', key: 's', label: 'Stripes & markings' },
    { name: 'highlight', key: 'h', label: 'Highlights & patches' },
    { name: 'belly', key: 'c', label: 'Muzzle, chest & paws' },
    { name: 'outline', key: 'x', label: 'Outline' },
    { name: 'nose', key: 'p', label: 'Nose & inner ears' },
    { name: 'eyes', key: 'e', label: 'Eyes' },
    { name: 'pupil', key: 'd', label: 'Pupils' },
    { name: 'glint', key: 'w', label: 'Eye glint' },
    { name: 'whiskers', key: 'k', label: 'Whiskers' },
  ];
  const definitions = [
    { id: 'tabby', name: 'Marmalade', description: 'Ginger tabby', palette: {
      fur: '#f4b85c', shade: '#db863f', markings: '#9c573f', highlight: '#ffdc91', belly: '#fff0cf', outline: '#362c40',
      nose: '#e69b9c', eyes: '#82bb91', pupil: '#263747', glint: '#fffaf0', whiskers: '#9c573f',
    } },
    { id: 'midnight', name: 'Midnight', description: 'Black cat', palette: {
      fur: '#2b2936', shade: '#1f1d29', markings: '#24222f', highlight: '#46435a', belly: '#34323f', outline: '#0e0d14',
      nose: '#7a5263', eyes: '#f2c230', pupil: '#14121a', glint: '#fffaf0', whiskers: '#9a96a8',
    } },
    { id: 'domino', name: 'Domino', description: 'Tuxedo', palette: {
      fur: '#302e39', shade: '#22202b', markings: '#292733', highlight: '#4a4757', belly: '#f6f3ec', outline: '#16141c',
      nose: '#e6a0a8', eyes: '#9ccc65', pupil: '#1d2a1b', glint: '#ffffff', whiskers: '#f6f3ec',
    } },
    { id: 'pebble', name: 'Pebble', description: 'Silver tabby', palette: {
      fur: '#a9b0b8', shade: '#7d8590', markings: '#4f5661', highlight: '#d2d7dc', belly: '#eef1f4', outline: '#2c3038',
      nose: '#d99aa5', eyes: '#b5c25a', pupil: '#2b3426', glint: '#ffffff', whiskers: '#4f5661',
    } },
    { id: 'mochi', name: 'Mochi', description: 'Siamese', palette: {
      fur: '#f1e6d2', shade: '#d8c6a6', markings: '#e3d4b8', highlight: '#fbf6ec', belly: '#fdf9f1', outline: '#3a2a26',
      nose: '#c98a8a', eyes: '#5aa7e8', pupil: '#1d2a44', glint: '#ffffff', whiskers: '#efe6d6',
    }, points: {
      fur: '#5e4436', shade: '#463126', markings: '#3a2820', highlight: '#7a5a49', belly: '#523a2e', nose: '#8a5f55',
    } },
    { id: 'patches', name: 'Patches', description: 'Calico', palette: {
      fur: '#f8f4ec', shade: '#d9cfc2', markings: '#3b3236', highlight: '#e8893a', belly: '#fffdf8', outline: '#3a2e33',
      nose: '#f0a0a8', eyes: '#d9a93a', pupil: '#2d2418', glint: '#ffffff', whiskers: '#8a7f78',
    } },
  ];

  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  function colour(value, field) {
    const m = typeof value === 'string' && value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) throw new Error(`"${field}" must be a colour like #2b2936`);
    const digits = m[1].length === 3 ? [...m[1]].map((d) => d + d).join('') : m[1];
    return '#' + digits.toLowerCase();
  }
  function text(value, field, max, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value !== 'string') throw new Error(`"${field}" must be text`);
    return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) || fallback;
  }
  function colours(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`"${field}" must be a set of colours`);
    const out = {};
    for (const { name } of slots) if (value[name] !== undefined) out[name] = colour(value[name], `${field}.${name}`);
    return out;
  }

  // Validates a cat from any source (builder, saved settings or a shared file) and fills missing colours.
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('A cat must be a JSON object');
    const own = raw.palette === undefined ? {} : colours(raw.palette, 'palette');
    const palette = { ...definitions[0].palette, whiskers: own.markings ?? definitions[0].palette.whiskers, ...own };
    const points = raw.points === undefined || raw.points === null ? {} : colours(raw.points, 'points');
    const cat = { name: text(raw.name, 'name', 40, 'Unnamed cat') };
    const description = text(raw.description, 'description', 60, ''), author = text(raw.author, 'author', 60, '');
    if (description) cat.description = description;
    if (author) cat.author = author;
    cat.palette = palette;
    if (Object.keys(points).length) cat.points = points;
    return cat;
  }

  function parse(raw) {
    if (!raw || typeof raw !== 'object' || raw.format !== FORMAT) throw new Error('This is not a Desktop Cat file');
    if (!Number.isInteger(raw.version) || raw.version < 1) throw new Error('This cat file has an invalid version');
    if (raw.version > VERSION) throw new Error('This cat was made with a newer version of Desktop Cat');
    return normalize(raw);
  }
  function parseText(json) {
    let raw;
    try { raw = JSON.parse(json); } catch { throw new Error('This is not a Desktop Cat file'); }
    return parse(raw);
  }
  function toFile(cat) {
    const { name, description, author, palette, points } = normalize(cat);
    return {
      format: FORMAT, version: VERSION, name, ...(description && { description }), ...(author && { author }),
      palette, ...(points && { points }),
    };
  }

  // Siamese-style colour points (face, ears, legs, paws and tail) from a single colour.
  const derivePoints = (base) => {
    const c = colour(base, 'points');
    return {
      fur: c, shade: mix(c, '#000000', 0.25), markings: mix(c, '#000000', 0.4), highlight: mix(c, '#ffffff', 0.18),
      belly: mix(c, '#000000', 0.12), whiskers: mix(c, '#ffffff', 0.6),
    };
  };

  const builtIn = definitions.map((d) => Object.freeze({ id: d.id, builtIn: true, ...normalize(d) }));
  const all = (custom = []) => [...builtIn, ...custom];
  const find = (id, custom = []) => all(custom).find((c) => c.id === id) || builtIn[0];
  return { FORMAT, VERSION, slots, builtIn, all, find, normalize, parse, parseText, toFile, derivePoints, mix };
});
