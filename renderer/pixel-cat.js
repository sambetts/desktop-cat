const pixelCat = (() => {
  const palette = {
    x: '#362c40', s: '#9c573f', o: '#db863f', g: '#f4b85c',
    h: '#ffdc91', c: '#fff0cf', w: '#fffaf0', p: '#e69b9c',
    e: '#82bb91', d: '#263747',
  };
  const art = {
    head: [
      '...xx.............xx....',
      '...xgx...........xgx....',
      '...xgpx.........xpgx....',
      '...xgppx.......xppgx....',
      '...xgpppxxxxxxxpppgx....',
      '..xxggggssgggssggggxx...',
      '.xogggggssgggssgggggox..',
      '.xoggggggghhggggggggox..',
      'xogghhhhggghggghhhhgggox.',
      'xogghhhhggghggghhhhgggox.',
      'xogggggggggggggggggggox.',
      'xogggggggggggggggggggox.',
      '.xoggggccccccccgggggox..',
      '.xoggccccccccccccggox...',
      '..xoccccccccccccccox....',
      '...xccccccccccccccx.....',
      '....xxccccccccccxx......',
      '......xxxxxxxxxx........',
    ],
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
      '....xxxxxxxxxxxxxxxxxx.....',
    ],
    sleep: [
      '..........xxxxxxxxxxxxxxxx..........',
      '.......xxxgggggghhhhggggggxxx.......',
      '.....xxogggggggghhhhggggggggoxx.....',
      '....xogggggssggggggggssggggggggox....',
      '...xoggggggssggggggggssgggggggggox...',
      '..xogggggggssggggggggssggggggggggox..',
      '..xoggggggggggggggggggggggggggggox..',
      '.xoggggggggggggggggggggggggggggggox.',
      '.xosgggggggggggggggggggggccccggggox.',
      '.xosggggggggggggggggggccccccccgggox.',
      '..xosggggggggggggggggccccccccccgox..',
      '...xosgggggggggggggccccccccccccox...',
      '....xosssssssssssssccccccccccox....',
      '.....xxxxxxxxxxxxxxxxxxxxxxxx.....',
    ],
    stretch: [
      '.......xxxxxxxxxxx.................',
      '.....xxggggghhhgggxx...............',
      '...xxogggggghhhgggggxx.............',
      '..xogggssggggggssgggggxx...........',
      '.xoggggssggggggssgggggggxx.........',
      'xogggggssggggggssgggggggggxx.......',
      'xogggggggggggggggggggggggggxx......',
      '.xosgggggggggggggggggggggggxx.....',
      '..xosgggggggggggggggggccccgggxx....',
      '...xosssssssssssssssssccccccgggxx..',
      '....xxxxxxxxxxxxxxxxxxxxxxxxxxxx...',
    ],
    tail: [
      '.....xxxxx....',
      '...xxhggggx...',
      '..xhggssgggx..',
      '.xhggssxogggx.',
      'xhggssx.xogox.',
      'xhggsx..xosox.',
      'xgggsx..xxxxx.',
      'xgggsx........',
      'xgggsx........',
      'xoggox........',
      '.xoggox.......',
      '.xossgox......',
      '..xossgox.....',
      '..xogggox.....',
      '...xogggox....',
      '...xogggox....',
      '....xosggox...',
      '....xossggox..',
      '.....xossggox.',
      '......xogggox.',
      '.......xogggx.',
      '........xxxxx.',
    ],
    curl: [
      '....xxxxxxxxxxxxxxxxxxxxxx......',
      '..xxogggggggggggggggggggggxx....',
      '.xogggssgggssgggssgggggggggox...',
      'xoggggssgggssgggssggggggggggox..',
      'xosggggggggggggggggggccccgggox..',
      '.xossssssssssssssssssccccggox...',
      '..xxxxxxxxxxxxxxxxxxxxxxxxx....',
    ],
    leg: [
      '..xxx.',
      '.xosx.',
      '.xogx.',
      '.xogx.',
      '.xggx.',
      '.xggx.',
      '.xggx.',
      '.xggx.',
      '.xggx.',
      '.xggx.',
      'xggggx',
      'xccccx',
      'xccccx',
      'xcsccx',
      '.xxxx.',
    ],
    paw: [
      '.xxxx.',
      'xggggx',
      'xggggx',
      'xccccx',
      'xccccx',
      'xcsccx',
      '.xxxx.',
    ],
    groom: [
      '.........xxxx.',
      '........xccccx',
      '........xcsccx',
      '.......xcccccx',
      '......xggcccxx',
      '.....xggggxx..',
      '....xggggx....',
      '...xogggx.....',
      '..xogggx......',
      '.xogggx.......',
      '..xxxxx.......',
    ],
    swat: [
      '..................xxxx.',
      '...............xxxccccx',
      'xxxxxxxxxxxxxxxgggccscx',
      'xgggggggggggggggggccccx',
      'xosgggggggggggggggcccxx',
      '.xxxxxxxxxxxxxxxxxxxx..',
    ],
    z: [
      'xxxxxx.',
      'xccccx.',
      'xxxccx.',
      '..xccx.',
      '.xccxxx',
      '.xccccx',
      '.xxxxxx',
    ],
  };
  const sprites = Object.fromEntries(Object.entries(art).map(([name, rows]) => {
    const image = document.createElement('canvas');
    image.width = Math.max(...rows.map((r) => r.length)); image.height = rows.length;
    const pixels = image.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((color, x) => {
      if (color === '.') return;
      pixels.fillStyle = palette[color]; pixels.fillRect(x, y, 1, 1);
    }));
    return [name, image];
  }));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function draw(ctx, cat) {
    const moving = Math.abs(cat.vx) > 1, sleeping = cat.state === 'sleep';
    const stretch = cat.state === 'stretch', eating = cat.state === 'eat', licking = cat.state === 'lick';
    const airborne = cat.air || cat.vy < -1;
    const seated = !moving && !sleeping && !stretch && !eating && !airborne;
    const t = reducedMotion.matches ? 0 : cat.t;
    const frame = Math.floor(t * 8) % 4;
    const stride = moving ? [-2, 0, 2, 0][frame] : 0;
    const bob = moving ? [0, -1, 0, -1][frame] : sleeping ? [0, 0, -1, 0][Math.floor(t * 2) % 4] : 0;
    const wag = [0, 1, 0, -1][Math.floor(t * (cat.state === 'smug' ? 6 : 2)) % 4];
    const part = (name, x, y) => ctx.drawImage(sprites[name], x, y);
    const rect = (color, x, y, w, h) => { ctx.fillStyle = palette[color]; ctx.fillRect(x, y, w, h); };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(cat.x), Math.round(cat.y));
    ctx.scale(cat.dir * 3, 3);

    if (sleeping) {
      part('sleep', -24, -16 + bob);
    } else {
      part('tail', (seated ? -23 : -26) + wag, (seated ? -32 : -31) + bob);
      if (seated) {
        part('sit', -13, -24);
        part('paw', -12, -7);
        part('paw', 0, -7);
        if (!licking && cat.swat <= 0) part('leg', 6, -15);
      } else if (stretch) {
        part('leg', -17, -15);
        part('leg', 12, -15);
        part('stretch', -21, -22);
        part('paw', 17, -7);
      } else {
        part('leg', -10 - stride, airborne ? -20 : -16);
        part('leg', 1 + stride, airborne ? -20 : -16);
        part('body', -18, -22 + bob);
        part('leg', -15 + stride, airborne ? -17 : -15 - (moving && frame === 1 ? 2 : 0));
        if (cat.swat <= 0) part('leg', 6 - stride, airborne ? -17 : -15 - (moving && frame === 3 ? 2 : 0));
      }
    }

    const hx = stretch ? 3 : sleeping ? 1 : seated ? -1 : 0;
    const hy = (sleeping ? -23 : stretch ? -24 : eating ? -27 + frame % 2 : seated ? -38 : -33) + bob;
    part('head', hx, hy);
    const closed = sleeping || stretch || eating || (licking && frame < 2) || t % 5 > 4.7;
    for (const x of [5, 15]) {
      if (closed) {
        rect('x', hx + x, hy + 10, 4, 1);
        rect('s', hx + x + 1, hy + 11, 2, 1);
      } else if (cat.state === 'smug') {
        rect('x', hx + x, hy + 9, 4, 2);
        rect('e', hx + x + 1, hy + 11, 2, 1);
      } else {
        rect('x', hx + x, hy + 9, 4, 4);
        rect('e', hx + x + 1, hy + 9, 2, 3);
        rect('d', hx + x + 2, hy + 10, 1, 3);
        rect('w', hx + x + 1, hy + 10, 1, 1);
      }
    }
    rect('p', hx + 11, hy + 13, 2, 1);
    rect('s', hx + 11, hy + 14, 2, 1);
    rect('x', hx + 10, hy + 15, 1, 1); rect('x', hx + 13, hy + 15, 1, 1);
    rect('s', hx + 1, hy + 13, 3, 1); rect('s', hx + 20, hy + 13, 3, 1);
    rect('s', hx, hy + 15, 3, 1); rect('s', hx + 18, hy + 15, 6, 1);

    if (sleeping) part('curl', -24, -7);
    if (licking) {
      part('groom', 1, -20);
      rect('p', hx + 11, hy + 17, 2, 2 + frame % 2);
    }
    if (cat.swat > 0) part('swat', 3 + (cat.swat < 0.2 ? 1 : 0), -19);
    ctx.restore();

    if (sleeping) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(cat.x + cat.dir * 36 - 7), Math.round(cat.y) - 94 - Math.floor(t * 2) % 4 * 4);
      ctx.scale(2, 2);
      part('z', 0, 0);
      ctx.restore();
    }
  }

  return { draw, padding: 84, height: 114 };
})();
