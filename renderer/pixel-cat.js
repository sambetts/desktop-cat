const pixelCat = (() => {
  // Sprite letters are palette slots from catCoats.slots (x outline, g fur, s markings, ...).
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
    // Held low and straight behind a crouching cat, tip curled up.
    tailLow: [
      '.xx...........',
      'xgsx..........',
      'xgsxxxxxxxxxxx',
      'xoggggsssggggg',
      '.xosssggggssog',
      '..xxxxxxxxxxxx',
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
  // Colour points (e.g. Siamese) recolour these parts; the Zs are not part of the cat.
  const pointParts = new Set(['head', 'tail', 'tailLow', 'leg', 'paw', 'groom', 'swat', 'curl']);
  const zPalette = { x: '#362c40', c: '#fff0cf' };
  const letters = (colours = {}) => Object.fromEntries(catCoats.slots.filter((s) => colours[s.name]).map((s) => [s.key, colours[s.name]]));
  function paint(coat) {
    const body = letters(coat.palette), face = { ...body, ...letters(coat.points) };
    const sprites = Object.fromEntries(Object.entries(art).map(([name, rows]) => {
      const palette = name === 'z' ? zPalette : pointParts.has(name) ? face : body;
      const image = document.createElement('canvas');
      image.width = Math.max(...rows.map((r) => r.length)); image.height = rows.length;
      const pixels = image.getContext('2d');
      rows.forEach((row, y) => [...row].forEach((color, x) => {
        if (color === '.') return;
        pixels.fillStyle = palette[color]; pixels.fillRect(x, y, 1, 1);
      }));
      return [name, image];
    }));
    return { sprites, face };
  }
  const painted = new Map();
  function coatSprites(coat) {
    const key = JSON.stringify([coat.palette, coat.points]);
    let result = painted.get(key);
    if (result) painted.delete(key);
    else {
      result = paint(coat);
      if (painted.size >= 32) painted.delete(painted.keys().next().value);
    }
    painted.set(key, result);
    return result;
  }
  let current = coatSprites(catCoats.builtIn[0]), size = 3;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function render(ctx, cat, { sprites, face: palette }, scale) {
    const climbing = cat.state === 'climb';
    const moving = Math.abs(cat.vx) > 1 || (climbing && Math.abs(cat.vy) > 1), sleeping = cat.state === 'sleep';
    const stretch = cat.state === 'stretch', eating = cat.state === 'eat', licking = cat.state === 'lick';
    const crouching = cat.state === 'stalk' || cat.state === 'ready', wiggling = cat.state === 'ready';
    const loafing = cat.state === 'loaf', since = cat.stateTime || 0;
    const airborne = !climbing && (cat.air || cat.vy < -1);
    const seated = !moving && !climbing && !sleeping && !stretch && !eating && !airborne && !crouching && !loafing;
    const t = reducedMotion.matches ? 0 : cat.t;
    const frame = Math.floor(t * (cat.state === 'zoom' ? 14 : crouching ? 4 : 8)) % 4;
    const stride = moving ? [-2, 0, 2, 0][frame] : 0;
    const bob = moving && !crouching ? [0, -1, 0, -1][frame] : sleeping ? [0, 0, -1, 0][Math.floor(t * 2) % 4] : 0;
    // Tail language: twitching while hunting or watching prey, a slow swish when smug, otherwise mostly still.
    const hunting = crouching || cat.watch;
    const wag = hunting ? [0, 1, 0, -1][Math.floor(t * 10) % 4]
      : cat.state === 'smug' ? [0, 1, 0, -1][Math.floor(t * 6) % 4]
        : seated && t % 7 < 1 ? [0, 1, 0, -1][Math.floor(t * 4) % 4] : 0;
    const kneading = cat.state === 'settle' && since > 1.2, knead = kneading && Math.floor(t * 4) % 2 === 0;
    const part = (name, x, y) => ctx.drawImage(sprites[name], x, y);
    const rect = (color, x, y, w, h) => { ctx.fillStyle = palette[color]; ctx.fillRect(x, y, w, h); };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Climbing turns the body and walk cycle on their side: feet against a wall in the facing direction.
    if (climbing) ctx.transform(0, -scale, cat.dir * scale, 0, Math.round(cat.x), Math.round(cat.y) - 27 * scale);
    else {
      ctx.translate(Math.round(cat.x), Math.round(cat.y));
      ctx.scale(cat.dir * scale, scale);
    }

    if (sleeping || loafing) {
      part('sleep', -24, -16 + bob);
    } else if (crouching) {
      // Low to the ground; just before a pounce the raised rear end wiggles.
      const wx = wiggling ? [0, 1, 0, -1][Math.floor(t * 12) % 4] : 0;
      part('tailLow', -27 + wx, (wiggling ? -17 : -15) + (wag < 0 ? -1 : 0));
      part('paw', -15 + wx - stride, -7);
      part('paw', -10 + wx + stride, -7);
      part('body', -18, -16);
      if (wiggling) ctx.drawImage(sprites.body, 0, 0, 12, 13, -18 + wx, -18, 12, 13);
      part('paw', 1 + stride, -7);
      part('paw', 6 - stride, -7);
    } else {
      part('tail', (seated ? -23 : -26) + wag, (seated ? -32 : -31) + bob);
      if (seated) {
        part('sit', -13, -24);
        part('paw', -12, -7);
        part('paw', 0, kneading && !knead ? -9 : -7); // kneading: front paws take turns pressing down
        if (!licking && cat.swat <= 0) part('leg', 6, knead ? -17 : -15);
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

    let hx = stretch ? 3 : sleeping ? 1 : crouching ? 3 : loafing ? -4 : seated ? -1 : 0;
    let hy = (sleeping ? -23 : stretch ? -24 : crouching ? -27 : loafing ? -28 : eating ? -27 + frame % 2 : seated ? -38 : -33) + bob;
    if (climbing) { // the head stays upright, peering out from the top of the climb
      ctx.restore(); ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(cat.x), Math.round(cat.y));
      ctx.scale(cat.dir * scale, scale);
      hx = -27; hy = -51;
    }
    part('head', hx, hy);
    // A slow blink (half closed, closed, half closed) is how cats say they trust you.
    const blink = reducedMotion.matches ? 0 : cat.blink || 0;
    const closed = sleeping || stretch || eating || (licking && frame < 2) || t % 5 > 4.7 || (blink > 0.35 && blink < 1.05);
    const lidded = blink > 0 || loafing || kneading || cat.state === 'smug';
    // Eyes follow whatever has the cat's attention; pupils go wide for the hunt.
    const look = cat.look, ahead = !look || look.x * cat.dir >= 0, up = !!look && look.y < -50 * scale;
    const wide = hunting || (cat.state === 'chase' && airborne);
    for (const x of [5, 15]) {
      if (closed) {
        rect('x', hx + x, hy + 10, 4, 1);
        rect('s', hx + x + 1, hy + 11, 2, 1);
      } else if (lidded) {
        rect('x', hx + x, hy + 9, 4, 2);
        rect('e', hx + x + 1, hy + 11, 2, 1);
      } else {
        const py = hy + (up ? 9 : 10);
        rect('x', hx + x, hy + 9, 4, 4);
        rect('e', hx + x + 1, hy + 9, 2, 3);
        rect('d', wide ? hx + x + 1 : hx + x + (ahead ? 2 : 1), py, wide ? 2 : 1, 3);
        rect('w', hx + x + (ahead ? 1 : 2), py, 1, 1);
      }
    }
    rect('p', hx + 11, hy + 13, 2, 1);
    rect('s', hx + 11, hy + 14, 2, 1);
    rect('x', hx + 10, hy + 15, 1, 1); rect('x', hx + 13, hy + 15, 1, 1);
    rect('k', hx + 1, hy + 13, 3, 1); rect('k', hx + 20, hy + 13, 3, 1);
    rect('k', hx, hy + 15, 3, 1); rect('k', hx + 18, hy + 15, 6, 1);
    if (stretch && since > 0.4 && since < 1.6) { // a big yawn
      rect('x', hx + 10, hy + 14, 4, 4);
      rect('p', hx + 11, hy + 15, 2, 2);
    } else if (cat.watch && frame % 2) { // chattering at prey it can't reach
      rect('x', hx + 10, hy + 15, 4, 2);
      rect('p', hx + 11, hy + 15, 2, 1);
    }

    if (sleeping || loafing) part('curl', -24, -7);
    if (licking) {
      part('groom', 1, -20);
      rect('p', hx + 11, hy + 17, 2, 2 + frame % 2);
    }
    if (cat.swat > 0 && !climbing) part('swat', 3 + (cat.swat < 0.2 ? 1 : 0), -19);
    ctx.restore();

    if (sleeping) {
      const u = scale / 3;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(cat.x + cat.dir * 36 * u - 7 * u), Math.round(cat.y) - Math.round(94 * u) - Math.floor(t * 2) % 4 * Math.round(4 * u));
      ctx.scale(Math.max(1, Math.round(2 * u)), Math.max(1, Math.round(2 * u)));
      part('z', 0, 0);
      ctx.restore();
    }
  }

  // The sprite's screen rectangle; a climbing cat is narrower and taller, hugging its wall.
  function box(cat, scale = size) {
    const x = Math.round(cat.x), y = Math.round(cat.y);
    if (cat.state === 'climb') {
      return { left: cat.dir > 0 ? x - 34 * scale : x, right: cat.dir > 0 ? x : x + 34 * scale, top: y - 51 * scale, bottom: y };
    }
    return { left: x - 28 * scale, right: x + 28 * scale, top: y - 38 * scale, bottom: y };
  }

  return {
    draw: (ctx, cat) => render(ctx, cat, current, size),
    drawCoat: (ctx, cat, coat, scale = size) => render(ctx, cat, coatSprites(coat), scale),
    setCoat: (coat) => { current = coatSprites(coat); },
    setScale: (scale) => { size = Math.max(1, Math.min(6, Math.round(scale) || 3)); },
    box,
    get scale() { return size; },
    get padding() { return 28 * size; },
    get height() { return 38 * size; },
    climbWidth: () => 34 * size,
    climbHeight: () => 51 * size,
  };
})();
