// Prototype cat designs from the cute-cat redesign; Kitten became the app's cat (renderer/pixel-cat.js), the rest are kept for later.
// Open index.html in a browser to see them animated. Each design draws a few poses in sprite pixels: origin at the feet, facing right.
const catDesigns = (() => {
  const mirror = (rows) => rows.map((r) => r + [...r.slice(0, -1)].reverse().join('')); // odd width, centre column shared
  // A smooth tail from per-row fill spans [x0, x1] (or a list of them): outlined, shaded on its left edge, ringed on `stripes` rows.
  function tube(spans, { stripes = () => false, fill = 'g' } = {}) {
    const rows = spans.map((s) => (Array.isArray(s[0]) ? s : [s]));
    const w = Math.max(...rows.flat().map(([, b]) => b)) + 3, h = rows.length + 2;
    const g = Array.from({ length: h }, () => Array(w).fill('.'));
    rows.forEach((row, i) => row.forEach(([a, b]) => {
      for (let x = a; x <= b; x++) g[i + 1][x + 1] = stripes(i, x) ? 's' : x === a && b - a >= 2 ? 'o' : fill;
    }));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] !== '.') continue;
      if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => /[^.x]/.test(g[y + dy]?.[x + dx] || '.'))) g[y][x] = 'x';
    }
    return g.map((r) => r.join(''));
  }
  const list = [];

  // Shared: a sleeping cat's tail, from the rump round its hindquarters and along its front, tapering to a tip by the chin.
  const sleepCurl = tube([[3, 5], [1, 5], [0, 4], [[0, 3], [24, 25]], [[0, 4], [23, 25]], [[0, 9], [21, 24]], [1, 23], [3, 15]],
    { stripes: (i, x) => i === 2 || (i >= 5 && [7, 8, 13, 14, 19].includes(x)) });

  // ---------------------------------------------------------------- A. Kitten: chibi proportions, huge eyes
  list.push({
    id: 'kitten', name: 'Kitten', blurb: 'Chibi kitten: big round head, huge sparkly eyes, blush, stubby legs; a short tail that stands up with a curl, wraps round its paws when sitting',
    art: {
      head: mirror([
        '..xx..........',
        '..xgx.........',
        '..xgpx........',
        '.xggppx.......',
        '.xggpppxxxxxxx',
        'xogggggghhgsgs',
        'xoggggghhhgsgs',
        'xogggggggggggs',
        'xogggggggggggg',
        'xogggggggggggg',
        'xssggggggggggg',
        'xogggggggggggg',
        'xssggggggggggg',
        'xogggggggggccc',
        'xogbbbgggccccc',
        '.xogggggcccccc',
        '.xoggggccccccc',
        '..xogggccccccc',
        '...xxogccccccc',
        '.....xxxxxxxxx',
      ]),
      sit: [
        '.........xxxxxxx......',
        '.......xxgggggggxx....',
        '......xoggggggggccx...',
        '.....xogggggggggcccx..',
        '....xoggsggggggccccx..',
        '....xogsgggggggccccx..',
        '...xoggsgggggggccccx..',
        '...xoggggggggggccccx..',
        '..xoggsgggggggcccccx..',
        '..xogsggggggggcccccx..',
        '.xogggggoooogggccccx..',
        '.xoggggoggggogggcccx..',
        'xoggggogggggggogcccx..',
        'xogggoggggggggogcccx..',
        'xogggoggggggggogcccx..',
        'xogggogggggggogccccx..',
        'xoggoggggggggogccccx..',
        '.xooggggggggoogccccx..',
        '..xxxxxxxxxxxxxxxxxx..',
      ],
      walk: [
        '.....xxxxxxxxxxxxxxxx.....',
        '...xxgggghhhhggggggggxx...',
        '..xogsgggggsggggsggggggx..',
        '.xogsgggggsggggsggggggggx.',
        'xoggsgggggsggggsgggggggggx',
        'xogggggggggggggggggggggggx',
        'xogggggggggggggggggggggggx',
        'xogggggggggggggggggggggggx',
        'xogggggggggggggggggggggggx',
        'xogggggggggggggggggccccccx',
        'xoogggggggggggggggcccccccx',
        '.xoogggggggggggggcccccccx.',
        '..xooooooooooooooocccccx..',
        '....xxxxxxxxxxxxxxxxxx....',
      ],
      sleep: mirror([
        '.......xxxxxxx',
        '.....xxggghhhh',
        '....xogggsgghh',
        '...xoggsggsggg',
        '..xoggsggsgggg',
        '.xoggggggggggg',
        'xogggggggggggg',
        'xogggggggggggg',
        'xogggggggggggg',
        'xogggggggggggg',
        'xooggggggggggg',
        '.xoooggggggggg',
        '..xxoooooooooo',
        '....xxxxxxxxxx',
      ]),
      sitFront: mirror([
        '.......xxxx',
        '.....xxgggg',
        '....xoggggc',
        '...xoggggcc',
        '...xogggccc',
        '..xogggcccc',
        '..xoggxcccx',
        '.xossgxcccx',
        '.xogggxcccx',
        '.xossgxcccx',
        'xoggggxcccx',
        'xoggggxcccx',
        'xoxxxxxcccx',
        'xoxcccxcscx',
        'xoxcccxcccx',
        '.xxxxxxxxxx',
      ]),
      tailFront: [
        '.....................xx.',
        '.xxx................xgsx',
        'xgggxx..............xggx',
        'xogggsxxxxxxxxxxxxxxxgsx',
        '.xooggsssgggsssgggsssggx',
        '..xxoooooooooooooooooox.',
        '....xxxxxxxxxxxxxxxxxx..',
      ],
      leg: ['xgggx', 'xgggx', 'xgggx', 'xgggx', 'xcccx', 'xcccx', '.xxx.'],
      legFar: ['xooox', 'xooox', 'xooox', 'xooox', 'xcccx', 'xcccx', '.xxx.'],
      paw: ['.xxx.', 'xcccx', 'xcccx', 'xcccx', '.xxx.'],
      tailUp: [
        '....xxxxx..',
        '...xgggggx.',
        '..xggsxxsgx',
        '..xgsx..xgx',
        '.xggx...xx.',
        '.xgsx......',
        '.xggx......',
        'xgggx......',
        'xsssx......',
        'xgggx......',
        'xgggx......',
        'xsssx......',
        'xgggx......',
        'xgggxx.....',
        '.xgggx.....',
        '..xxxx.....',
      ],
      tailWrap: sleepCurl,
      tailLow: [
        '.xxx............',
        'xgsgx...........',
        'xggsxxxxxxxxxxxx',
        'xgggggsssgggsssg',
        '.xoggggggggggggg',
        '..xooooooooooooo',
        '...xxxxxxxxxxxxx',
      ],
    },
    points: ['head', 'leg', 'legFar', 'paw', 'tailUp', 'tailWrap', 'tailLow', 'tailFront'],
    face: {
      eyes: [[5, 8], [17, 8]],
      open: ['.xxx.', 'xwwdx', 'xwdex', 'xddex', 'xeeex', '.xxx.'],
      wide: ['.xxx.', 'xwddx', 'xdddx', 'xdddx', 'xeddx', '.xxx.'],
      lidded: ['.....', '.....', 'xxxxx', 'xddex', 'xeeex', '.xxx.'],
      closed: ['.....', '.....', '.....', 'x...x', '.xxx.', '.....'],
      nose: [[12, 14, 'ppp'], [13, 15, 'p']],
      mouth: [[11, 16, 'x.x.x'], [12, 17, 'x.x']],
      whiskers: [[-2, 14, 'kk'], [-1, 16, 'kk'], [27, 14, 'kk'], [26, 16, 'kk']],
    },
    poses: {
      sit({ part, face, flick }) {
        part('sitFront', -8, -16);
        part('tailFront', -12, -7 - flick);
        part('head', -11, -34); face(-11, -34);
      },
      walk({ part, face, stride, bob }) {
        part('legFar', -8 - stride, -7); part('legFar', 7 + stride, -7);
        part('tailUp', -17, -32 + bob);
        part('walk', -14, -20 + bob);
        part('leg', -11 + stride, -7); part('leg', 4 - stride, -7);
        part('head', -1, -36 + bob); face(-1, -36 + bob);
      },
      sleep({ part, face, breathe }) {
        part('sleep', -20, -14 + breathe);
        part('tailWrap', -23, -10);
        part('head', -1, -24); face(-1, -24, 'closed');
      },
      stalk({ part, face, stride }) {
        part('tailLow', -28, -15);
        part('paw', -12 - stride, -5); part('paw', 5 + stride, -5);
        part('walk', -15, -17);
        part('paw', -8 + stride, -5); part('paw', 9 - stride, -5);
        part('head', -2, -27); face(-2, -27, 'wide');
      },
    },
  });

  // ---------------------------------------------------------------- B. Classic: the original cat, tidied
  list.push({
    id: 'classic', name: 'Classic', blurb: "The original cat, tidied: same body, rounder face with bigger eyes and blush; a slimmer tapered tail that grows from the rump and flicks forward at the tip",
    art: {
      head: mirror([
        '...xx.......',
        '...xgx......',
        '...xgpx.....',
        '...xgppx....',
        '...xgpppxxxx',
        '..xxggggssgs',
        '.xogggggssgs',
        '.xoggggggghh',
        'xogggggggggh',
        'xogggggggggg',
        'xogggggggggg',
        'xogggggggggg',
        'xogbbgggcccc',
        '.xoggccccccc',
        '..xocccccccc',
        '...xcccccccc',
        '....xxcccccc',
        '......xxxxxx',
      ]),
      sit: [
        '.............xxxxxxx....',
        '...........xxggghhggx...',
        '..........xogggghhgggx..',
        '.........xoggggccccggx..',
        '........xogggggccccggx..',
        '.......xoggggggccccggx..',
        '......xosggggggccccggx..',
        '.....xosgggggggccccggx..',
        '....xosggggggggccccggx..',
        '...xosgggggggggccccggx..',
        '..xosggggggggggccccggx..',
        '..xosgggssgggggccccggx..',
        '.xosgggsssgggggccccggx..',
        '.xosgggggggggggccccggx..',
        'xosggggggggggggccccggx..',
        'xosggggggggggggccccggx..',
        'xosggggggggggggccccggx..',
        'xosgggssgggggggccccggx..',
        '.xosgggssggggggccccggx..',
        '.xosgggggggggggccccggx..',
        '..xosggggggggggccccggx..',
        '...xxxxxxxxxxxxxxxxxx...',
      ],
      body: [
        '.....xxxxxxxxxxxxxxxx.......',
        '...xxggggghhhggggggggxx.....',
        '..xogggggghhhgggggggggox....',
        '.xogggssgggggggssggggggox...',
        'xoggggssgggggggssgggggggox..',
        'xoggggssgggggggssgggggggox..',
        'xoggggggggggggggggggggggox..',
        'xoggggggggggggggggggggggox..',
        '.xoggggggggggggggggccccgox..',
        '.xosggggggggggggggccccccox..',
        '..xosggggggggggggccccccox...',
        '...xosssssssssssccccccox....',
        '....xxxxxxxxxxxxxxxxxx......',
      ],
      sleep: [
        '..........xxxxxxxxxxxxxxxx..........',
        '.......xxxgggggghhhhggggggxxx.......',
        '.....xxogggggggghhhhggggggggoxx.....',
        '....xogggggssggggggggssggggggggox...',
        '...xoggggggssggggggggssgggggggggox..',
        '..xogggggggssggggggggssggggggggggox.',
        '..xoggggggggggggggggggggggggggggox..',
        '.xoggggggggggggggggggggggggggggggox.',
        '.xosgggggggggggggggggggggccccggggox.',
        '.xosggggggggggggggggggccccccccgggox.',
        '..xosggggggggggggggggccccccccccgox..',
        '...xosgggggggggggggccccccccccccox...',
        '....xosssssssssssssccccccccccox.....',
        '.....xxxxxxxxxxxxxxxxxxxxxxxxx......',
      ],
      leg: ['..xxx.', '.xosx.', '.xogx.', '.xogx.', '.xggx.', '.xggx.', '.xggx.', '.xggx.', '.xggx.', '.xggx.', 'xggggx', 'xccccx', 'xccccx', 'xcsccx', '.xxxx.'],
      paw: ['.xxxx.', 'xggggx', 'xggggx', 'xccccx', 'xccccx', 'xcsccx', '.xxxx.'],
      tail: tube([[4, 5], [3, 5], [2, 4], [2, 4], [1, 3], [1, 3], [1, 3], [1, 3], [1, 3], [1, 4], [2, 4], [2, 5], [3, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 10]],
        { stripes: (i) => i % 4 === 2 && i < 15 }),
      tailLow: [
        '.xx...........',
        'xgsx..........',
        'xgsxxxxxxxxxxx',
        'xoggggsssggggg',
        '.xosssggggssog',
        '..xxxxxxxxxxxx',
      ],
      wrap: sleepCurl,
    },
    points: ['head', 'leg', 'paw', 'tail', 'tailLow', 'wrap'],
    face: {
      eyes: [[5, 8], [14, 8]],
      open: ['.xx.', 'xwdx', 'xdex', 'xeex', '.xx.'],
      wide: ['.xx.', 'xwdx', 'xddx', 'xddx', '.xx.'],
      lidded: ['....', '....', 'xxxx', 'xdex', '.xx.'],
      closed: ['....', '....', '....', 'x..x', '.xx.'],
      nose: [[10, 12, 'ppp'], [11, 13, 'p']],
      mouth: [[9, 14, 'x.x.x'], [10, 15, 'x.x']],
      whiskers: [[-2, 13, 'kkk'], [0, 15, 'kkk'], [22, 13, 'kkk'], [20, 15, 'kkk']],
    },
    poses: {
      sit({ part, face, flick }) {
        part('tail', -19 - flick, -25);
        part('sit', -13, -24);
        part('paw', -12, -7); part('paw', 0, -7);
        part('leg', 6, -15);
        part('head', -1, -38); face(-1, -38);
      },
      walk({ part, face, stride, bob }) {
        part('leg', -10 - stride, -16); part('leg', 1 + stride, -16);
        part('tail', -25, -35 + bob);
        part('body', -18, -22 + bob);
        part('leg', -15 + stride, -15); part('leg', 6 - stride, -15);
        part('head', 0, -33 + bob); face(0, -33 + bob);
      },
      sleep({ part, face, breathe }) {
        part('sleep', -24, -16 + breathe);
        part('wrap', -26, -10);
        part('head', 1, -23); face(1, -23, 'closed');
      },
      stalk({ part, face, stride }) {
        part('tailLow', -27, -15);
        part('paw', -15 - stride, -7); part('paw', -10 + stride, -7);
        part('body', -18, -16);
        part('paw', 1 + stride, -7); part('paw', 6 - stride, -7);
        part('head', 3, -27); face(3, -27, 'wide');
      },
    },
  });

  // Tufts along the top and sides of an outlined sprite (never underneath, where it meets the floor). Grows it by 1px.
  function fluff(rows, period = 3) {
    const h = rows.length + 2, w = Math.max(...rows.map((r) => r.length)) + 2;
    const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => rows[y - 1]?.[x - 1] || '.'));
    const out = g.map((r) => [...r]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] !== 'x' || (x + 2 * y) % period) continue;
      const open = [[0, -1], [-1, 0], [1, 0]].find(([dx, dy]) => (g[y + dy]?.[x + dx] || '.') === '.');
      if (!open) continue;
      const [dx, dy] = open, inner = g[y - dy]?.[x - dx];
      out[y + dy][x + dx] = 'x';
      out[y][x] = inner && !'.x'.includes(inner) ? inner : 'g';
    }
    return out.map((r) => r.join(''));
  }

  // An outlined ellipse w x h, filled by fill(x, y).
  function blob(w, h, fill = () => 'g') {
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const inside = (x, y) => ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2 <= 1;
    return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
      if (!inside(x, y)) return '.';
      return [[0, 1], [0, -1], [1, 0], [-1, 0]].every(([dx, dy]) => inside(x + dx, y + dy)) ? fill(x, y) : 'x';
    }).join(''));
  }

  // ---------------------------------------------------------------- C. Floof: long-haired
  {
    const c = list.find((d) => d.id === 'classic').art;
    const plume = (spans) => fluff(tube(spans), 2);
    list.push({
      id: 'floof', name: 'Floof', blurb: 'Long-haired: tufted outline, cheek and chest ruffs, ear tufts, and a big plume tail held high like a feather duster',
      art: {
        head: fluff(c.head.map((r, y) => (y < 13 ? r : r.replace(/x/g, (m, x) => (x >= 5 && x <= 17 ? 'c' : m)))), 4),
        ruff: fluff(blob(27, 15, (x, y) => (y > 7 && Math.abs(x - 13) < 7 ? 'c' : 'g')), 2),
        sit: fluff(c.sit, 3),
        body: fluff(c.body, 3),
        sleep: fluff(c.sleep, 3),
        leg: c.leg, paw: c.paw,
        tail: plume([[5, 7], [3, 8], [2, 8], [1, 7], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 7], [1, 7], [1, 8], [2, 9], [3, 10], [4, 11], [5, 12], [6, 13], [8, 13]]),
        tailUp: plume([[6, 8], [4, 10], [3, 11], [2, 11], [1, 10], [1, 9], [0, 8], [0, 7], [0, 7], [0, 6], [1, 6], [1, 6], [2, 7], [2, 7], [3, 8]]),
        tailLow: plume([[0, 3], [0, 6], [0, 13], [1, 16], [3, 16], [6, 16]]),
        wrap: fluff(sleepCurl, 2),
      },
      points: ['head', 'leg', 'paw', 'tail', 'tailUp', 'tailLow', 'wrap'],
      face: {
        ...list.find((d) => d.id === 'classic').face,
        whiskers: [[-3, 13, 'kkk'], [-1, 15, 'kkk'], [23, 13, 'kkk'], [21, 15, 'kkk']],
      },
      poses: {
        sit({ part, face, flick }) {
          part('tail', -21 - flick, -27);
          part('sit', -14, -25);
          part('paw', -12, -7); part('paw', 0, -7);
          part('leg', 6, -15);
          part('ruff', -4, -31);
          part('head', -2, -39); face(-1, -38);
        },
        walk({ part, face, stride, bob }) {
          part('leg', -10 - stride, -16); part('leg', 1 + stride, -16);
          part('tailUp', -27, -37 + bob);
          part('body', -19, -23 + bob);
          part('leg', -15 + stride, -15); part('leg', 6 - stride, -15);
          part('ruff', -3, -26 + bob);
          part('head', -1, -34 + bob); face(0, -33 + bob);
        },
        sleep({ part, face, breathe }) {
          part('sleep', -25, -17 + breathe);
          part('wrap', -27, -11);
          part('ruff', -2, -16); part('head', 0, -24); face(1, -23, 'closed');
        },
        stalk({ part, face, stride }) {
          part('tailLow', -29, -14);
          part('paw', -15 - stride, -7); part('paw', -10 + stride, -7);
          part('body', -19, -17);
          part('paw', 1 + stride, -7); part('paw', 6 - stride, -7);
          part('ruff', 0, -20); part('head', 2, -28); face(3, -27, 'wide');
        },
      },
    });
  }

  // A soft squircle: rounder on top (n=2.2) and flatter underneath (n=bottom). Shaded on its left and bottom edges.
  function mochi(w, h, fill = () => 'g', bottom = 3.5) {
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const inside = (x, y) => {
      const nx = Math.abs(x - cx) / (w / 2), ny = Math.abs(y - cy) / (h / 2);
      return nx ** (y > cy ? bottom : 2.2) + ny ** (y > cy ? bottom : 2.2) <= 1;
    };
    const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
      if (!inside(x, y)) return '.';
      return [[0, 1], [0, -1], [1, 0], [-1, 0]].every(([dx, dy]) => inside(x + dx, y + dy)) ? fill(x, y) : 'x';
    }));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] === 'g' && (g[y][x - 1] === 'x' || g[y + 1]?.[x] === 'x')) g[y][x] = 'o';
    }
    return g.map((r) => r.join(''));
  }

  // ---------------------------------------------------------------- D. Bean: minimalist mochi
  {
    // Fill for a mochi of width w: highlight top-left, three forehead stripes over the face, cream belly patch.
    const coat = (w, h, faceX, bellyY) => (x, y) => {
      if ([-3, 0, 3].includes(x - faceX) && y >= 2 && y <= (x === faceX ? 4 : 3)) return 's';
      if (y === 2 && x > w * 0.2 && x < w * 0.35) return 'h';
      if (((x - faceX) / (w * 0.28)) ** 2 + ((y - bellyY) / (h * 0.32)) ** 2 < 1) return 'c';
      return 'g';
    };
    const ear = ['...x...', '..xgx..', '.xgpgx.', 'xgpppgx', 'xgggggx'];
    list.push({
      id: 'bean', name: 'Bean', blurb: 'Minimal mochi: one soft round shape with tiny ears, little low-set eyes, blush and a stubby tail. Simple, squishy, very readable at small sizes',
      art: {
        ear,
        sit: mochi(27, 28, coat(27, 28, 13, 24)),
        walk: mochi(32, 19, coat(32, 19, 22, 15)),
        sleep: mochi(34, 14, coat(34, 14, 22, 12), 4),
        stalk: mochi(34, 13, coat(34, 13, 22, 11), 4),
        paw: ['.xxx.', 'xcccx', 'xcccx', '.xxx.'],
        leg: ['xgggx', 'xgggx', 'xcccx', '.xxx.'],
        legFar: ['xooox', 'xooox', 'xcccx', '.xxx.'],
        tail: tube([[2, 3], [1, 3], [0, 2], [0, 2], [1, 3], [2, 6]], { stripes: (i) => i === 1 }),
        tailUp: tube([[3, 4], [1, 4], [0, 2], [0, 2], [0, 2], [1, 3]], { stripes: (i) => i === 2 }),
        tailLow: tube([[0, 1], [0, 6], [1, 6]]),
        curl: tube([[2, 4], [1, 3], [0, 3], [[0, 3], [11, 12]], [[0, 5], [9, 12]], [1, 11], [3, 8]], { stripes: (i, x) => x === 6 }),
      },
      points: ['ear', 'tail', 'tailUp', 'tailLow', 'curl', 'paw', 'leg', 'legFar'],
      face: {
        eyes: [[0, 0], [11, 0]],
        open: ['.xx.', 'xwdx', 'xdex', '.xx.'],
        wide: ['.xx.', 'xwdx', 'xddx', '.xx.'],
        lidded: ['....', 'xxxx', 'xdex', '.xx.'],
        closed: ['....', '....', 'x..x', '.xx.'],
        nose: [[-2, 4, 'bb'], [15, 4, 'bb'], [7, 4, 'p']],
        mouth: [[5, 5, 'x.x.x'], [6, 6, 'x.x']],
      },
      poses: {
        sit({ part, face, flick }) {
          part('tail', -19, -10 - flick);
          part('ear', -10, -30); part('ear', 4, -30);
          part('sit', -13, -28);
          part('paw', -7, -4); part('paw', 3, -4);
          face(-7, -16);
        },
        walk({ part, face, stride, bob }) {
          part('legFar', -12 - stride, -4); part('legFar', 6 + stride, -4);
          part('tailUp', -19, -25 + bob);
          part('ear', -2, -26 + bob); part('ear', 9, -24 + bob);
          part('walk', -16, -22 + bob);
          part('leg', -9 + stride, -4); part('leg', 8 - stride, -4);
          face(-1, -15 + bob);
        },
        sleep({ part, face, breathe }) {
          part('ear', -3, -17 + breathe); part('ear', 8, -15 + breathe);
          part('sleep', -17, -14 + breathe);
          part('curl', -20, -10);
          face(-2, -8 + breathe, 'closed');
        },
        stalk({ part, face, stride }) {
          part('tailLow', -24, -12);
          part('paw', -12 - stride, -4); part('paw', 6 + stride, -4);
          part('ear', -3, -18); part('ear', 8, -16);
          part('stalk', -17, -15);
          part('paw', -8 + stride, -4); part('paw', 10 - stride, -4);
          face(-2, -10, 'wide');
        },
      },
    });
  }

  // ---------------------------------------------------------------- rendering
  const letters = (colours = {}) => Object.fromEntries(catCoats.slots.filter((s) => colours[s.name]).map((s) => [s.key, colours[s.name]]));
  function palettes(coat) {
    const body = letters(coat.palette);
    body.b = catCoats.mix(coat.palette.fur, coat.palette.nose, 0.55);
    const face = { ...body, ...letters(coat.points) };
    if (coat.points?.fur) face.b = catCoats.mix(coat.points.fur, coat.palette.nose, 0.55);
    return { body, face };
  }
  const cache = new Map();
  function paint(design, coat) {
    const key = design.id + JSON.stringify([coat.palette, coat.points]);
    if (cache.has(key)) return cache.get(key);
    const { body, face } = palettes(coat);
    const sprites = Object.fromEntries(Object.entries(design.art).map(([name, rows]) => {
      const palette = design.points.includes(name) ? face : body;
      const image = document.createElement('canvas');
      image.width = Math.max(...rows.map((r) => r.length)); image.height = rows.length;
      const g = image.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === '.') return;
        if (!palette[c]) throw new Error(`${design.id}.${name}: unknown colour "${c}"`);
        g.fillStyle = palette[c]; g.fillRect(x, y, 1, 1);
      }));
      return [name, image];
    }));
    const result = { sprites, face };
    cache.set(key, result);
    return result;
  }

  function draw(ctx, id, coat, pose, { x, y, scale, dir = 1, t = 0, blink = false }) {
    const design = list.find((d) => d.id === id);
    const { sprites, face: colours } = paint(design, coat);
    const frame = Math.floor(t * 8) % 4;
    const grid = (rows, gx, gy) => rows.forEach((row, ry) => [...row].forEach((c, rx) => {
      if (c === '.') return;
      ctx.fillStyle = colours[c]; ctx.fillRect(gx + rx, gy + ry, 1, 1);
    }));
    const api = {
      t, frame,
      stride: pose === 'walk' || pose === 'stalk' ? [-2, 0, 2, 0][frame] : 0,
      bob: pose === 'walk' ? [0, -1, 0, -1][frame] : 0,
      breathe: [0, 0, -1, 0][Math.floor(t * 2) % 4],
      flick: t % 4 > 3.5 ? 1 : 0,
      part: (name, px, py) => ctx.drawImage(sprites[name], px, py),
      rect: (c, px, py, w = 1, h = 1) => { ctx.fillStyle = colours[c]; ctx.fillRect(px, py, w, h); },
      face: (hx, hy, mode = 'open') => {
        const f = design.face, eye = f[blink && mode !== 'closed' ? 'closed' : mode] || f.open;
        for (const [ex, ey] of f.eyes) grid(eye, hx + ex, hy + ey);
        for (const [fx, fy, row] of [...f.nose, ...f.mouth, ...(f.whiskers || [])]) grid([row], hx + fx, hy + fy);
      },
    };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(dir * scale, scale);
    design.poses[pose](api);
    ctx.restore();
  }
  // Sprites whose rows differ in length (a miscounted pixel shifts the rest of the row).
  const lint = () => list.flatMap((d) => Object.entries(d.art).flatMap(([name, rows]) => {
    const w = rows[0].length, bad = rows.map((r, i) => [i, r.length]).filter(([, l]) => l !== w);
    return bad.length ? [`${d.id}.${name} width ${w}: ` + bad.map(([i, l]) => `row ${i}=${l}`).join(', ')] : [];
  }));
  return { list, draw, lint };
})();
