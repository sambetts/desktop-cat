const pixelCat = (() => {
  // Sprite letters are palette slots from catCoats.slots (x outline, g fur, s markings, ...); b is a blush mixed from fur and nose.
  // Symmetric sprites are written as their left half plus the shared centre column.
  const mirror = (rows) => rows.map((r) => r + [...r.slice(0, -1)].reverse().join(''));
  const art = {
    // A big round kitten head facing the viewer; the face (eyes, nose, mouth, whiskers) is drawn on top.
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
    // Sitting, facing the viewer: chest and hind paws. The front legs are separate so they can knead, groom and swat.
    sit: mirror([
      '.......xxxx',
      '.....xxgggg',
      '....xoggggc',
      '...xoggggcc',
      '...xogggccc',
      '..xogggcccc',
      '..xoggxcccc',
      '.xossgxcccc',
      '.xogggxcccc',
      '.xossgxcccc',
      'xoggggxcccc',
      'xoggggxcccc',
      'xoxxxxx....',
      'xoxcccx....',
      'xoxcccx....',
      '.xxxxxx....',
    ]),
    frontLeg: ['xcccx', 'xcccx', 'xcccx', 'xcccx', 'xcccx', 'xcccx', 'xcccx', 'xcscx', 'xcccx', '.xxx.'],
    // A front paw held up to be washed, toes on top; the forearm below it runs down into the chest.
    groom: [
      '.xxxxx.',
      'xcxcxcx',
      'xcccccx',
      'xcccccx',
      'xcccccx',
      '.xcccx.',
    ],
    forearm: Array(6).fill('xcccx'),
    // Wrapped round the front paws; the tip (tailTip) stands up and flicks on its own.
    tailFront: [
      '.xxx....................',
      'xgggxx..................',
      'xogggsxxxxxxxxxxxxxxxgsx',
      '.xooggsssgggsssgggsssggx',
      '..xxoooooooooooooooooox.',
      '....xxxxxxxxxxxxxxxxxx..',
    ],
    tailTip: ['.xx.', 'xgsx', 'xggx', 'xgsx'],
    // Side-on bean of a body for walking, jumping, eating, stalking and climbing.
    body: [
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
    leg: ['xgggx', 'xgggx', 'xgggx', 'xgggx', 'xcccx', 'xcccx', '.xxx.'],
    legFar: ['xooox', 'xooox', 'xooox', 'xooox', 'xcccx', 'xcccx', '.xxx.'],
    paw: ['.xxx.', 'xcccx', 'xcccx', 'xcccx', '.xxx.'],
    // A happy tail: straight up with a little forward curl at the tip.
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
    // Held low and straight behind a crouching (or climbing) cat, tip curled up.
    tailLow: [
      '.xxx............',
      'xgsgx...........',
      'xggsxxxxxxxxxxxx',
      'xgggggsssgggsssg',
      '.xoggggggggggggg',
      '..xooooooooooooo',
      '...xxxxxxxxxxxxx',
    ],
    // Curled up in a ball, the tail wrapped round from the rump to the chin.
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
    curl: [
      '....xxx.....................',
      '..xxoggx....................',
      '.xoggggx....................',
      'xsssssx..................xx.',
      'xogggx..................xggx',
      'xoggggxxxxx...........xxoggx',
      'xoggggggssgxxxxxxxxxxxogggx.',
      '.xogggggssggggssggggsggggx..',
      '..xxogggssggggssgxxxxxxxx...',
      '....xxxxxxxxxxxxx...........',
    ],
    // A play-bow stretch: rump and tail high, chest and chin down on outstretched front legs.
    stretch: [
      '...xxxxxx.................',
      '.xxoggsshxxxx.............',
      'xoggggssgggggxxx..........',
      'xoggggggggggssggxx........',
      'xoggggggggggssggggxx......',
      '.xogggggggggggggggsgxx....',
      '..xoggggggggggggggsgggx...',
      '...xoogggggggggggggggggx..',
      '....xxooggggggggggggggggx.',
      '......xxoogggggggggggggggx',
      '........xxooogggggcccggggx',
      '..........xxxoooogcccccccx',
      '.............xxxxocccccxx.',
      '.................xxxxxx...',
    ],
    legLong: ['xgggx', 'xgggx', 'xgggx', 'xgggx', 'xgggx', 'xgggx', 'xgggx', 'xcccx', 'xcccx', '.xxx.'],
    legLongFar: ['xooox', 'xooox', 'xooox', 'xooox', 'xooox', 'xooox', 'xooox', 'xcccx', 'xcccx', '.xxx.'],
    // A front leg reaching forward: a swat, or resting flat in a stretch.
    swat: [
      '.............xxx.',
      'xxxxxxxxxxxxxcccx',
      'xcccccccccccccscx',
      'xcccccccccccccccx',
      'xxxxxxxxxxxxxxxx.',
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
  const pointParts = new Set(['head', 'frontLeg', 'groom', 'forearm', 'tailFront', 'tailTip', 'tailUp', 'tailLow', 'curl', 'leg', 'legFar', 'legLong', 'legLongFar', 'paw', 'swat']);
  const zPalette = { x: '#362c40', c: '#fff0cf' };
  const letters = (colours = {}) => Object.fromEntries(catCoats.slots.filter((s) => colours[s.name]).map((s) => [s.key, colours[s.name]]));
  const blush = (colours) => (colours.g && colours.p ? catCoats.mix(colours.g, colours.p, 0.55) : colours.g);
  function paint(coat) {
    const body = letters(coat.palette), face = { ...body, ...letters(coat.points) };
    body.b = blush(body); face.b = blush(face);
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
    const swatting = cat.swat > 0 && !climbing, reach = cat.swat < 0.2 ? 1 : 0;
    const part = (name, x, y) => ctx.drawImage(sprites[name], x, y);
    const rect = (color, x, y, w = 1, h = 1) => { ctx.fillStyle = palette[color]; ctx.fillRect(x, y, w, h); };
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Climbing turns the body and walk cycle on their side: feet against a wall in the facing direction.
    if (climbing) ctx.transform(0, -scale, cat.dir * scale, 0, Math.round(cat.x), Math.round(cat.y) - 27 * scale);
    else {
      ctx.translate(Math.round(cat.x), Math.round(cat.y));
      ctx.scale(cat.dir * scale, scale);
    }

    // Each pose places the head (hx, hy) and, if a paw is swatting, where the swat reaches from.
    let hx, hy, swatAt = [5, -13];
    if (sleeping || loafing) {
      part('sleep', -20, -14 + bob);
      part('curl', -23, -10);
      [hx, hy] = sleeping ? [-1, -24] : [-4, -27];
    } else if (crouching) {
      // Low to the ground; just before a pounce the raised rear end wiggles.
      const wx = wiggling ? [0, 1, 0, -1][Math.floor(t * 12) % 4] : 0, creep = stride / 2;
      part('tailLow', -27 + wx, (wiggling ? -17 : -15) + (wag < 0 ? -1 : 0));
      part('paw', -12 + wx - creep, -5);
      part('paw', 5 + creep, -5);
      part('body', -15, -17);
      if (wiggling) ctx.drawImage(sprites.body, 0, 0, 12, 14, -15 + wx, -19, 12, 14);
      part('paw', -8 + creep, -5);
      if (!swatting) part('paw', 8 - creep, -5);
      [hx, hy] = [-2, -27];
      swatAt = [6, -9];
    } else if (seated) {
      part('sit', -8, -16);
      part('frontLeg', -2, knead ? -12 : -10); // kneading: front paws take turns pressing down
      if (!licking && !swatting) part('frontLeg', 2, kneading && !knead ? -12 : -10);
      part('tailFront', -12, -6);
      part('tailTip', 8 + wag, -7);
      [hx, hy] = licking ? [-10, -33] : [-11, -34]; // washing: head tilted down into the raised paw
      swatAt = [3, -14];
    } else if (stretch) {
      part('tailUp', -27, -31);
      part('legLongFar', -21, -10);
      part('stretch', -26, -17);
      part('legLong', -24, -10);
      part('swat', -2, -5);
      [hx, hy] = [-1, -23];
    } else {
      // Standing, walking, leaping (legs tucked and splayed), eating with the head down, or climbing.
      const tuck = airborne ? 2 : 0;
      part('legFar', -8 - stride - tuck, -7 - tuck);
      part('legFar', 7 + stride + tuck, -7 - tuck);
      if (climbing) part('tailLow', -26, -15);
      else part('tailUp', -17, -32 + bob);
      part('body', -14, -20 + bob);
      part('leg', -11 + stride - tuck, -7 - tuck - (moving && frame === 1 ? 1 : 0));
      if (!swatting) part('leg', 4 - stride + tuck, -7 - tuck - (moving && frame === 3 ? 1 : 0));
      [hx, hy] = [-1, eating ? -27 + frame % 2 : -36 + bob];
    }

    if (climbing) { // the head stays upright, peering out from the top of the climb
      ctx.restore(); ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(cat.x), Math.round(cat.y));
      ctx.scale(cat.dir * scale, scale);
      hx = -29; hy = -51;
    }
    part('head', hx, hy);
    // A slow blink (half closed, closed, half closed) is how cats say they trust you.
    const blink = reducedMotion.matches ? 0 : cat.blink || 0;
    const closed = sleeping || stretch || eating || licking || t % 5 > 4.7 || (blink > 0.35 && blink < 1.05);
    const lidded = blink > 0 || loafing || kneading || cat.state === 'smug';
    // Eyes follow whatever has the cat's attention; pupils go wide for the hunt.
    const look = cat.look, ahead = !look || look.x * cat.dir >= 0, up = !!look && look.y < -50 * scale;
    const wide = hunting || (cat.state === 'chase' && airborne);
    for (const ex of [hx + 5, hx + 17]) {
      const ey = hy + 8;
      if (closed) { // a contented upside-down smile
        rect('x', ex, ey + 3); rect('x', ex + 4, ey + 3); rect('x', ex + 1, ey + 4, 3, 1);
      } else if (lidded) {
        rect('x', ex, ey + 2, 5, 1); rect('x', ex, ey + 3, 1, 2); rect('x', ex + 4, ey + 3, 1, 2); rect('x', ex + 1, ey + 5, 3, 1);
        rect('e', ex + 1, ey + 3, 3, 2);
        rect('d', ex + (ahead ? 2 : 1), ey + 3, 2, 2);
      } else { // big round eyes with a sparkle
        rect('x', ex + 1, ey, 3, 1); rect('x', ex, ey + 1, 1, 4); rect('x', ex + 4, ey + 1, 1, 4); rect('x', ex + 1, ey + 5, 3, 1);
        rect('e', ex + 1, ey + 1, 3, 4);
        const px = wide ? ex + 1 : ex + (ahead ? 2 : 1), py = ey + (up ? 1 : 2), pw = wide ? 3 : 2;
        rect('d', px, py, pw, 3);
        rect('w', px, py);
        if (wide) rect('w', px + 2, py + 2);
      }
    }
    rect('p', hx + 12, hy + 14, 3, 1); rect('p', hx + 13, hy + 15);
    if (stretch && since > 0.4 && since < 1.6) { // a big yawn
      rect('x', hx + 11, hy + 16, 5, 4);
      rect('p', hx + 12, hy + 17, 3, 2);
    } else if (cat.watch && frame % 2) { // chattering at prey it can't reach
      rect('x', hx + 11, hy + 16, 5, 2);
      rect('p', hx + 12, hy + 16, 3, 1);
    } else { // a little ω mouth
      for (const mx of [11, 13, 15]) rect('x', hx + mx, hy + 16);
      rect('x', hx + 12, hy + 17); rect('x', hx + 14, hy + 17);
    }
    rect('k', hx - 2, hy + 14, 2, 1); rect('k', hx - 1, hy + 16, 2, 1);
    rect('k', hx + 27, hy + 14, 2, 1); rect('k', hx + 26, hy + 16, 2, 1);

    if (licking) {
      // Washing: the paw is held to the mouth and licked in short bursts, lifting to meet the tongue.
      const lick = t % 2.5 < 1.8 && frame % 2 === 1;
      const px = hx + 15, py = hy + 15 - (lick ? 1 : 0), arm = -10 - (py + 6);
      if (lick) rect('p', hx + 14, hy + 16, 1, 2);
      ctx.drawImage(sprites.forearm, 0, 0, 5, arm, px + 1, py + 6, 5, arm);
      part('groom', px, py);
    }
    if (swatting) part('swat', swatAt[0] + reach, swatAt[1]);
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
