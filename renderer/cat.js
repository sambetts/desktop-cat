const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth; canvas.height = innerHeight;

let settings = { interest: 2, nightSleep: true };
let env = { cursor: { x: -1, y: -1 }, idle: 0, typing: false, hour: 12, width: innerWidth, height: innerHeight,
  floors: [{ x0: 0, x1: innerWidth, y: innerHeight - 40 }], active: null };
let prevCursor = null, cursorSpeed = 0, displayLayout = null;
window.catApi.onSettings((s) => {
  settings = s;
  pixelCat.setCoat(catCoats.find(s.coat, s.customCats));
  pixelCat.setScale(s.scale ?? 3);
});
function receiveEnvironment(e) {
  if (prevCursor) cursorSpeed = Math.hypot(e.cursor.x - prevCursor.x, e.cursor.y - prevCursor.y);
  prevCursor = e.cursor; env = e;
  const layout = JSON.stringify(e.floors);
  if (layout !== displayLayout) { displayLayout = layout; placeCat(); }
}
window.catApi.onEnv(receiveEnvironment);

const G = 1400;
const interest = () => settings.interest;
const reactChance = () => [0, 0.05, 0.3, 0.6, 1][interest()];
// Bigger cats take bigger strides, so movement scales with sprite size.
const speed = () => [60, 80, 110, 160, 240][interest()] * pixelCat.scale / 3;
// Climbing is rare unless the cat is feeling playful.
const climbChance = () => [0, 0, 0.12, 0.4, 0.85][interest()];
const exploreChance = () => [0, 0, 0.005, 0.02, 0.06][interest()];
const climbSpeed = () => speed() * 0.8;
// The highest a cat will jump; anything taller it has to climb.
const maxJump = () => 650 * pixelCat.scale / 3;
const rand = (a, b) => a + Math.random() * (b - a);
const isNight = () => settings.nightSleep && (env.hour >= 23 || env.hour < 7);
// Cats are at their liveliest around dawn and dusk.
const crepuscular = () => (env.hour >= 5 && env.hour < 8) || (env.hour >= 17 && env.hour < 22);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---- world ----
// look: where the cat's attention is, relative to it. watch: prey it can't reach. blink: a slow blink in progress.
const cat = { x: 300, y: 0, vx: 0, vy: 0, dir: 1, state: 'sit', t: 0, stateTime: 0, dur: 3, onWindow: false, air: false, swat: 0, daring: false, climb: null, route: null,
  look: null, watch: false, blink: 0, calm: 0, pounce: null, leap: null };
let toys = []; // yarn, bowl, cup, laser
const surfaceAt = (x, y = cat.y) => {
  const spanning = env.floors.filter((f) => x >= f.x0 && x < f.x1);
  const containing = spanning.find((f) => y > (f.top ?? 0) && y <= f.y);
  if (containing) return containing;
  const distance = (f) => Math.hypot(Math.max(f.x0 - x, 0, x - f.x1), Math.max((f.top ?? 0) - y, 0, y - f.y));
  return (spanning.length ? spanning : env.floors).reduce((a, b) => distance(a) <= distance(b) ? a : b);
};
const floorAt = (x, y = cat.y) => surfaceAt(x, y).y;
const catFloorAt = (x = cat.x, y = cat.y) => {
  const surface = surfaceAt(x, y);
  // Keep the entire sprite above the higher floor while straddling screens.
  return env.floors.filter((f) => x + pixelCat.padding > f.x0 && x - pixelCat.padding < f.x1 &&
    (f.top ?? 0) < surface.y && f.y > (surface.top ?? 0)).reduce((floor, f) => Math.min(floor, f.y), surface.y);
};
const winTop = () => (env.active && env.active.y > 50 && env.active.width > 200 ? env.active : null);
const onWinRange = (x) => {
  const w = winTop();
  return w && x > w.x + 10 && x < w.x + w.width - 10 &&
    w.y > (surfaceAt(x, w.y).top ?? 0) && w.y <= catFloorAt(x, w.y);
};
cat.y = floorAt(cat.x);

const workArea = (f) => ({ x0: f.x0, x1: f.x1, top: f.top ?? 0, bottom: f.y });
const screenArea = (f) => f.screen || workArea(f);
// True when every column of the box is covered from top to bottom by the areas.
function covered(box, areas) {
  const edges = [box.left, box.right, ...areas.flatMap((a) => [a.x0, a.x1]).filter((x) => x > box.left && x < box.right)].sort((a, b) => a - b);
  return edges.slice(1).every((edge, i) => {
    const x = (edges[i] + edge) / 2;
    let reach = box.top;
    for (const a of areas.filter((a) => x >= a.x0 && x < a.x1).sort((a, b) => a.top - b.top)) {
      if (a.top > reach) break;
      reach = Math.max(reach, a.bottom);
    }
    return reach >= box.bottom;
  });
}

function keepCatVisible() {
  // Climbing or jumping may pass in front of a taskbar; a resting cat stays inside the work areas.
  const transit = cat.state === 'climb' || cat.air;
  if (covered(pixelCat.box(cat), env.floors.map(transit ? screenArea : workArea))) return;
  const positions = env.floors.filter((f) => f.x1 - f.x0 >= pixelCat.padding * 2 && f.y - (f.top ?? 0) >= pixelCat.height).map((f) => ({
    x: Math.max(Math.ceil(f.x0) + pixelCat.padding, Math.min(Math.floor(f.x1) - pixelCat.padding, cat.x)),
    y: Math.max(Math.ceil(f.top ?? 0) + pixelCat.height, Math.min(f.y, cat.y)),
  }));
  const nearest = positions.sort((a, b) => Math.hypot(a.x - cat.x, a.y - cat.y) - Math.hypot(b.x - cat.x, b.y - cat.y))[0];
  if (!nearest) return;
  if (nearest.x !== cat.x && (cat.state === 'walk' || cat.state === 'zoom')) cat.dir *= -1;
  if (nearest.y !== cat.y) { cat.vy = 0; cat.air = false; }
  if (cat.state === 'climb') { cat.climb = null; setState('sit', 2); }
  cat.x = nearest.x; cat.y = nearest.y; cat.onWindow = false;
}

// ---- climbing ----
// A climb hugs a wall (a screen or window edge) with the sprite turned on its side. A route says where to
// stand at the foot of the wall, which way to face, and where to step off. Routes whose path would leave
// the screens are never chosen.
const standOn = (f, x) => Math.max(f.x0 + pixelCat.padding, Math.min(f.x1 - pixelCat.padding, x));
const roomy = (f) => f.x1 - f.x0 >= pixelCat.padding * 2 && f.y - (f.top ?? 0) >= pixelCat.height;
const sideBySide = (a, b) => b.y > (a.top ?? 0) && (b.top ?? 0) < a.y && Math.max(a.x0, b.x0) <= Math.min(a.x1, b.x1) + 1;
const sameWindow = (a, b) => a && b && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.width - b.width) < 2;
// A climbing cat is taller than a standing one. It climbs until its head is where it will be once standing
// on top (the tail hangs `lift` below the ledge), so a climb never needs more headroom than standing does.
function bestWall(walls, fromY, toY, goalX) {
  const W = pixelCat.climbWidth(), lift = pixelCat.climbHeight() - pixelCat.height, screens = env.floors.map(screenArea);
  const up = toY < fromY, cost = (r) => Math.abs(cat.x - r.baseX) + Math.abs(r.landX - goalX);
  // Walls are snapped to whole pixels on the side away from the cat, so a rounded sprite never pokes past a screen edge.
  return walls.map((r) => ({ ...r, wall: r.dir > 0 ? Math.floor(r.wall) : Math.ceil(r.wall) })).map((r) => ({
    ...r, toY, startY: up ? fromY : fromY + lift, endY: up ? toY + lift : toY,
    path: { left: r.dir > 0 ? r.wall - W : r.wall, right: r.dir > 0 ? r.wall : r.wall + W, top: Math.min(fromY, toY) - pixelCat.height, bottom: Math.max(fromY, toY) },
  })).filter((r) => covered(r.path, screens)).sort((a, b) => cost(a) - cost(b))[0] || null;
}
// Up or down between screens stacked on top of each other, through the part of the edge they share.
function climbRoute(from, to, goalX) {
  const W = pixelCat.climbWidth(), lo = Math.max(from.x0, to.x0), hi = Math.min(from.x1, to.x1);
  if (from === to || !roomy(from) || !roomy(to) || sideBySide(from, to) || hi - lo < W) return null;
  return bestWall([{ wall: hi, dir: 1 }, { wall: lo, dir: -1 }].map((r) => {
    const middle = r.wall - r.dir * W / 2;
    return { ...r, baseX: standOn(from, middle), landX: standOn(to, middle) };
  }), from.y, to.y, goalX);
}
// The first step towards another screen: a climb, or { x } to walk to. Searches screen to screen, so a cat
// can walk across one screen to reach the edge it shares with the screen above.
function nextHop(from, to, goalX, canClimb = true) {
  const prev = new Map([[from, null]]), queue = [from];
  while (queue.length && !prev.has(to)) {
    const f = queue.shift();
    for (const g of env.floors) {
      if (!prev.has(g) && roomy(g) && (sideBySide(f, g) || (canClimb && climbRoute(f, g, goalX)))) { prev.set(g, f); queue.push(g); }
    }
  }
  if (from === to || !prev.has(to)) return null;
  let hop = to;
  while (prev.get(hop) !== from) hop = prev.get(hop);
  return sideBySide(from, hop) ? { x: standOn(hop, goalX) } : climbRoute(from, hop, goalX);
}
// Up the side of a window that is too high to jump onto.
function windowRoute(w) {
  const from = surfaceAt(cat.x, cat.y), W = pixelCat.climbWidth();
  if (cat.onWindow || !roomy(from) || w.y >= from.y) return null;
  const route = bestWall([{ wall: w.x, dir: 1 }, { wall: w.x + w.width, dir: -1 }].map((r) => ({
    ...r, baseX: standOn(from, r.wall - r.dir * W / 2),
    landX: Math.max(w.x + 11, Math.min(w.x + w.width - 11, r.wall + r.dir * pixelCat.padding)),
    window: { x: w.x, y: w.y, width: w.width },
  })), from.y, w.y, w.x + w.width / 2);
  return route && onWinRange(route.landX) ? route : null;
}
function approachClimb(route, then) {
  if (!moveToward(route.baseX, 4)) return;
  Object.assign(cat, { x: route.wall, y: route.startY, dir: route.dir, vx: 0, vy: 0, air: false, onWindow: false,
    climb: { ...route, then, left: Math.max(6, cat.dur - cat.stateTime) } });
  setState('climb', 120);
}
function climbStep(dt) {
  const c = cat.climb;
  if (!c || (c.window && !sameWindow(c.window, winTop()))) { // lost its grip
    Object.assign(cat, { climb: null, vx: 0, vy: 0, air: true, ignoreWin: true });
    setState('jump', 3);
    cat.landThen = null;
    return;
  }
  const up = c.endY < cat.y;
  cat.x = c.wall; cat.vx = 0; cat.vy = (up ? -1 : 1) * climbSpeed();
  cat.y = up ? Math.max(c.endY, cat.y + cat.vy * dt) : Math.min(c.endY, cat.y + cat.vy * dt);
  if (cat.y !== c.endY) return;
  Object.assign(cat, { x: c.landX, y: c.toY, vy: 0, air: false, onWindow: !!c.window, ignoreWin: false, climb: null });
  setState(c.then, c.then === 'sit' ? 3 : c.left);
  cat.daring = true; // still keen: keeps going if the trip needs another climb
}
// Heads for a point, climbing between stacked screens only when the cat is daring. True once level with it.
function travel(goal, stop, dt) {
  const from = surfaceAt(cat.x, cat.y), to = surfaceAt(goal.x, goal.y);
  if (to === from || cat.onWindow || cat.air) return moveToward(goal.x, stop);
  const hop = nextHop(from, to, goal.x, cat.daring);
  if (hop && hop.wall !== undefined) approachClimb(hop, cat.state);
  else if (hop) moveToward(hop.x, 4);
  else {
    // Out of reach: waits as close as it can get, chattering at it, and may yet work up the courage to climb.
    cat.watch = true;
    if (!cat.daring && Math.random() < climbChance() * 0.1 * dt) cat.daring = true;
    moveToward(standOn(from, goal.x), stop);
  }
  return false;
}

function setState(s, dur) {
  if (s !== cat.state) { cat.route = null; cat.pounce = null; cat.leap = null; cat.dribble = false; cat.daring = Math.random() < climbChance(); }
  cat.state = s; cat.stateTime = 0; cat.dur = dur ?? rand(2, 5); cat.bat = null; cat.paw = null;
}
function jump(vy, vx = 0, then = null) { cat.vy = vy; cat.vx = vx; cat.air = true; cat.onWindow = false; setState('jump', 3); cat.landThen = then; }
function land(dur) {
  if (cat.state !== 'jump') return;
  cat.vx = 0;
  const missed = cat.pounce && !cat.pounce.hit;
  if (missed) return setState('lick', rand(1.5, 3)); // a quick wash: "I meant to do that"
  setState(cat.landThen || 'sit', cat.landThen ? rand(3, 6) : dur);
}
// A low, flat leap at a ball. It doesn't always land where it was aimed.
function pounce(y) {
  const u = pixelCat.scale / 3, vy = 420 * Math.sqrt(u), flight = 2 * vy / G;
  jump(-vy, (y.x - cat.x + rand(-70, 70) * u) / flight, 'chase');
  cat.pounce = { hit: false };
}
// Turns round a few times and kneads before lying down; already asleep, it just sleeps on.
function nap(dur) {
  if (cat.state === 'sleep') return setState('sleep', dur);
  setState('settle', 2.6);
  cat.napFor = dur; cat.turns = 0;
}
function placeCat(point) {
  const home = env.floors.find((f) => f.primary) || env.floors[0];
  Object.assign(cat, {
    x: point ? point.x : (home.x0 + home.x1) / 2, y: point ? point.y : home.y,
    vx: 0, vy: 0, air: false, onWindow: false, ignoreWin: false, swat: 0, climb: null, pounce: null, leap: null,
  });
  setState('sit', 5);
}
window.catApi.onSummon(placeCat);

window.catApi.onToy((kind) => {
  if (kind === 'yarn') {
    // Dropped from the top of the highest screen at the cursor, so it is visible as it falls.
    const x = env.cursor.x > 0 ? env.cursor.x : 600, under = env.floors.filter((f) => x >= f.x0 && x < f.x1);
    toys.push({ kind, x, y: (under.length ? Math.min(...under.map((f) => f.top ?? 0)) : 0) + 100, vx: rand(-200, 200), vy: 0 });
  } else if (kind === 'laser') toys.push({ kind, life: 20 });
  else if (kind === 'food') {
    const f = surfaceAt(cat.x, cat.y);
    toys.push({ kind, x: Math.max(f.x0 + 80, Math.min(f.x1 - 80, cat.x + rand(-400, 400))), y: f.y, food: 5 });
  }
});

const toyOf = (k) => toys.find((t) => t.kind === k);
function chaseTarget() {
  if (toyOf('laser')) return { x: env.cursor.x, why: 'laser' };
  const y = toyOf('yarn'); if (y) return { x: y.x, why: 'yarn' };
  return null;
}
// Within paw's reach of the yarn ball (it might be on a screen far above).
const reachesYarn = (y, slack = 1) => Math.abs(y.x - cat.x) < 30 * slack * pixelCat.scale / 3 && Math.abs(y.y - cat.y) < 40 * slack * pixelCat.scale / 3;
function swatYarn(y) { cat.swat = 0.4; y.vx = cat.dir * rand(300, 600); y.vy = -rand(200, 500); }

// ---- batting ----
// Sitting up and reaching out with a front paw: patting a ball along, or swiping at a cursor wiggled close by.
const YARN_RADIUS = 12;
const shoulder = (dir = cat.dir) => ({ x: cat.x + dir * 4 * pixelCat.scale, y: cat.y - 11 * pixelCat.scale });
const withinPaw = (p, slack, dir) => { const s = shoulder(dir); return Math.hypot(p.x - s.x, p.y - s.y) <= 17 * pixelCat.scale + slack; };
const BAT_CYCLE = 0.52; // paw up, strike, paw down
// How excited the cursor has to make a cat before it bats at it, and how keen it is once it is.
const batThreshold = () => [Infinity, Infinity, 0.8, 0.5, 0.2][interest()];
const batCursorChance = () => [0, 0, 0.6, 1.2, 2.5][interest()];
function startBat(what, swipes) {
  setState('bat', swipes * BAT_CYCLE + 1);
  cat.bat = { what, swipes, struck: -1 };
}
// Where to sit to pat the ball: a leg's length to one side of it, on the side the cat is already on if there's room.
function batSpot(y) {
  const f = surfaceAt(y.x, y.y), reach = 18 * pixelCat.scale + YARN_RADIUS, side = cat.x < y.x ? -1 : 1;
  return [side, -side].map((s) => y.x + s * reach).find((x) => x >= f.x0 + pixelCat.padding && x <= f.x1 - pixelCat.padding) ?? null;
}
function batTarget() {
  const y = toyOf('yarn');
  if (cat.bat.what === 'yarn') return y && { x: y.x - cat.dir * YARN_RADIUS * 0.8, y: y.y - YARN_RADIUS };
  return env.cursor.x >= 0 ? env.cursor : null;
}
function batStep() {
  const b = cat.bat, target = b && batTarget(), s = pixelCat.scale;
  if (b && b.what === 'cursor' && target) cat.dir = target.x >= cat.x ? 1 : -1;
  const n = Math.floor(cat.stateTime / BAT_CYCLE), phase = cat.stateTime % BAT_CYCLE;
  if (!target || n >= b.swipes || !withinPaw(target, b.what === 'yarn' ? YARN_RADIUS * 2 : 6 * s)) {
    // The ball has been sent on its way (follow it and pat it again), or the game is over.
    const yarn = b && b.what === 'yarn' && toyOf('yarn');
    cat.batCool = rand(2, 4);
    if (yarn) { setState('chase', rand(3, 6)); cat.dribble = Math.random() < 0.75; } else setState('sit', rand(1.5, 3));
    return;
  }
  const toTarget = { x: target.x - cat.x, y: target.y - cat.y };
  // With reduced motion the paw just reaches out, rather than flailing up and down.
  if (reducedMotion.matches) cat.paw = toTarget;
  else if (phase < 0.2) cat.paw = { x: cat.dir * 18 * s, y: -26 * s }; // raised beside the head
  else if (phase < 0.34) cat.paw = toTarget;
  else cat.paw = { x: cat.dir * 14 * s, y: -5 * s }; // back on the ground
  if (phase < 0.2 || b.struck >= n) return;
  b.struck = n;
  const y = b.what === 'yarn' && toyOf('yarn');
  if (!y) return; // a cursor can't be knocked anywhere; the cat is happy just to have got it
  if (n < b.swipes - 1) y.vx += cat.dir * rand(30, 60); // a tentative pat first
  else if (Math.random() < 0.25) swatYarn(y); // a big swipe
  else { y.vx = cat.dir * rand(140, 240); y.vy = -rand(140, 260); }
}
// Excitement builds while the cursor darts about close by, and fades when it rests. An excited, playful cat
// that can reach a wiggling cursor may bat at it.
function maybeBatCursor(dt) {
  const c = env.cursor, s = pixelCat.scale;
  const close = c.x >= 0 && Math.hypot(c.x - cat.x, c.y - (cat.y - 20 * s)) < 200 * s / 3;
  cat.excite = Math.max(0, Math.min(2, (cat.excite || 0) + (close && cursorSpeed > 4 ? Math.min(cursorSpeed, 40) / 20 : -0.5) * dt));
  cat.batCool = Math.max(0, (cat.batCool || 0) - dt);
  const ready = cat.state === 'sit' || cat.state === 'investigate' || (cat.state === 'chase' && !chaseTarget());
  if (!ready || cat.air || cat.batCool > 0 || cursorSpeed <= 2 || cat.excite < batThreshold()) return;
  const dir = c.x >= cat.x ? 1 : -1;
  if (!withinPaw(c, 3 * s, dir) || Math.random() >= batCursorChance() * dt) return;
  cat.dir = dir; cat.vx = 0;
  startBat('cursor', 2 + Math.floor(rand(0, 3)));
}

function decide() {
  const lvl = interest();
  const awake = env.idle < 20;
  const hungryBowl = toyOf('food');
  if (hungryBowl && lvl > 0) { setState('toBowl', 8); return; }
  if (cat.state === 'eat') return setState('lick', rand(3, 6)); // a wash after every meal
  const toy = lvl > 0 && chaseTarget();
  if (toy) { setState('chase', rand(4, 8)); return; }
  if (isNight() && lvl < 4) return nap(rand(30, 60));
  if (!awake && lvl < 4) {
    const r = Math.random();
    return r < 0.3 ? setState('lick', rand(15, 40)) : r < 0.5 ? setState('loaf', rand(15, 40)) : nap(rand(15, 40));
  }
  if (cat.state === 'sleep') return setState('stretch', 2); // waking up: a long stretch and a yawn
  // The zoomies: a sudden mad dash, most likely around dawn and dusk.
  if (lvl >= 3 && !cat.onWindow && !reducedMotion.matches && Math.random() < (lvl === 4 ? 0.06 : 0.03) * (crepuscular() ? 2 : 1)) {
    setState('zoom', rand(3, 6)); cat.dir = Math.random() < 0.5 ? -1 : 1;
    return;
  }
  // The user is typing: go and have a look at what they're working on.
  if (env.typing && lvl >= 2 && Math.random() < reactChance()) {
    if (winTop() && !cat.onWindow && Math.random() < 0.7) return setState('toWindow', 8);
    return setState('investigate', rand(5, 10));
  }
  if (cursorSpeed > 8 && lvl > 0 && Math.random() < reactChance())
    return setState(lvl >= 3 ? 'chase' : 'investigate', rand(4, 8));
  if (lvl === 4 && Math.hypot(env.cursor.x - cat.x, env.cursor.y - cat.y) < 500) return setState('chase', rand(4, 8));
  // Gets curious about the window the user is working in.
  if (lvl >= 2 && winTop() && !cat.onWindow && Math.random() < 0.15 * lvl / 2) return setState('toWindow', 8);
  if (cat.onWindow) {
    if (lvl === 4 && env.typing && Math.random() < 0.5) return setState('helpType', rand(5, 9));
    if (lvl >= 3 && !toyOf('cup') && Math.random() < 0.25) { spawnCup(); return setState('toCup', 8); }
    if (Math.random() < 0.15) return setState('hopDown', 2);
  }
  // Now and then a playful cat goes off to explore another screen, even one it has to climb to.
  if (!cat.onWindow && Math.random() < exploreChance()) {
    const from = surfaceAt(cat.x, cat.y);
    const places = env.floors.filter((f) => f !== from && nextHop(from, f, (f.x0 + f.x1) / 2));
    const goal = places[Math.floor(Math.random() * places.length)];
    if (goal) {
      setState('explore', 40);
      cat.daring = true; cat.goal = { x: rand(goal.x0 + pixelCat.padding, goal.x1 - pixelCat.padding), y: goal.y };
      return;
    }
  }
  const r = Math.random();
  if (r < 0.25) setState('lick', rand(3, 6));
  else if (r < 0.47) { setState('walk', rand(2, 5)); cat.dir = Math.random() < 0.5 ? -1 : 1; }
  else if (r < 0.6) setState('stretch', 2);
  else if (r < 0.72) nap(rand(15, 30));
  else if (r < 0.85) setState('loaf', rand(6, 15));
  else setState('sit', rand(2, 6));
}

function spawnCup() {
  const w = winTop(); if (!w) return;
  toys.push({ kind: 'cup', x: w.x + w.width - 40, y: w.y, vx: 0, vy: 0, falling: false });
}

function moveToward(tx, stop) {
  const dx = tx - cat.x;
  cat.dir = dx >= 0 ? 1 : -1;
  cat.vx = Math.abs(dx) > stop ? cat.dir * speed() : 0;
  return Math.abs(dx) <= stop;
}

function update(dt) {
  cat.stateTime += dt; cat.t += dt;
  const c = env.cursor, w = winTop(), u = pixelCat.scale / 3;
  cat.watch = false;
  maybeBatCursor(dt);

  switch (cat.state) {
    case 'walk':
      if (cat.onWindow) { if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1; }
      else if ((cat.dir < 0 && cat.x <= pixelCat.padding) || (cat.dir > 0 && cat.x >= env.width - pixelCat.padding)) cat.dir *= -1;
      cat.vx = cat.dir * speed() * 0.6;
      break;
    case 'zoom': // a mad dash with sudden about-turns and hops
      if (cat.onWindow) { if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1; }
      else if ((cat.dir < 0 && cat.x <= pixelCat.padding) || (cat.dir > 0 && cat.x >= env.width - pixelCat.padding)) cat.dir *= -1;
      if (!cat.air && Math.random() < 0.7 * dt) cat.dir *= -1;
      if (!cat.air && Math.random() < 0.6 * dt) { cat.vy = -rand(300, 450) * Math.sqrt(u); cat.air = true; }
      cat.vx = cat.dir * speed() * 2.2;
      break;
    case 'investigate': moveToward(c.x, 160); break;
    case 'chase': {
      const t = chaseTarget();
      if (t && t.why === 'yarn') {
        const y = toyOf('yarn'), dy = cat.y - y.y, gap = Math.abs(y.x - cat.x);
        const sameSurface = !cat.air && !cat.onWindow && surfaceAt(y.x, y.y) === surfaceAt(cat.x, cat.y);
        const settled = sameSurface && y.vy === 0 && Math.abs(y.y - cat.y) < 4;
        // A ball that has stopped rolling is prey: creep up on it before pouncing.
        if (settled && !cat.dribble && Math.abs(y.vx) < 20 && gap > 90 * u && gap < 320 * u) { setState('stalk', 8); break; }
        // A ball close by gets patted. One just patted along is followed, staying behind it, and patted again.
        const spot = sameSurface && (cat.dribble ? gap < 400 * u : settled && Math.abs(y.vx) < 60 && gap < 90 * u) ? batSpot(y) : null;
        if (spot !== null) {
          if (moveToward(spot, Math.max(3, speed() * dt)) && settled && Math.abs(y.vx) < 60) {
            cat.dir = y.x >= cat.x ? 1 : -1;
            startBat('yarn', 1 + Math.floor(rand(0, 2.2)));
          }
          break;
        }
        if (!travel(y, 30, dt)) break;
        if (reachesYarn(y)) { if (Math.random() < 0.05) { swatYarn(y); setState('chase', 6); } }
        // Leaps at a ball bouncing just overhead.
        else if (dy > 0 && dy < 300 && !cat.air && !cat.onWindow && Math.random() < 0.04) { cat.vx = 0; jump(-Math.sqrt(2 * G * (dy + 20)), 0, 'chase'); }
        break;
      }
      const near = moveToward(t ? t.x : c.x, t ? 30 : 40);
      if (near && ((t && t.why === 'laser') || (!t && cursorSpeed > 12))) jump(-420, cat.dir * speed() * 0.8);
      break;
    }
    case 'stalk': { // belly to the ground, creeping closer
      const y = toyOf('yarn');
      if (!y || y.vy !== 0 || Math.abs(y.vx) >= 20 || surfaceAt(y.x, y.y) !== surfaceAt(cat.x, cat.y)) { setState('chase', rand(3, 6)); break; }
      if (moveToward(y.x, 80 * u)) setState('ready', rand(0.5, 1.2));
      else cat.vx *= 0.3;
      break;
    }
    case 'ready': // the wiggle, then the leap
      cat.vx = 0;
      if (cat.stateTime < cat.dur) break;
      if (cat.leap) jump(-cat.leap.vy);
      else if (toyOf('yarn')) pounce(toyOf('yarn'));
      else setState('sit', 2);
      break;
    case 'explore': if (travel(cat.goal, 20, dt)) setState('sit', 3); break;
    case 'toWindow':
      if (!w) { setState('sit', 2); break; }
      if (cat.onWindow) { setState('sit', 3); break; }
      if (cat.route) {
        if (sameWindow(cat.route.window, w)) approachClimb(cat.route, 'sit'); else setState('sit', 2);
        break;
      }
      if (!onWinRange(cat.x)) moveToward(Math.max(w.x + 40, Math.min(w.x + w.width - 40, cat.x)), 5);
      else {
        const h = catFloorAt() - w.y;
        cat.vx = 0;
        if (h > 0 && h < maxJump()) { setState('ready', rand(0.4, 0.9)); cat.leap = { vy: Math.sqrt(2 * G * (h + 50)) }; } // sizes it up first
        // Too high to jump: a daring cat climbs up the side instead.
        else if (!(h > 0 && cat.daring && (cat.route = windowRoute(w)))) setState('sit', 2);
      }
      break;
    case 'hopDown': cat.onWindow = false; cat.ignoreWin = true; cat.vx = cat.dir * 60; break;
    case 'helpType': // paces across the window the user is typing in
      if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1;
      cat.vx = cat.dir * speed() * 0.5;
      break;
    case 'toBowl': {
      const b = toyOf('food');
      if (!b) { setState('sit', 2); break; }
      if (moveToward(b.x, 20)) { setState('eat', 4); }
      break;
    }
    case 'eat': {
      const b = toyOf('food');
      if (b && cat.stateTime > cat.dur - 0.1) { b.food--; if (b.food <= 0) toys = toys.filter((t) => t !== b); }
      cat.vx = 0; break;
    }
    case 'toCup': {
      const cup = toyOf('cup');
      if (!cup || !cat.onWindow) { setState('sit', 2); break; }
      if (moveToward(cup.x - 30, 10) && !cup.falling) {
        cat.swat = 0.5; cup.falling = true; cup.vx = 120;
        setState('smug', 3);
      }
      break;
    }
    case 'jump': { // swats a ball it leapt for, mid-air
      const y = toyOf('yarn');
      if (y && cat.landThen === 'chase' && !cat.swat && reachesYarn(y, 1.5)) {
        swatYarn(y);
        if (cat.pounce) cat.pounce.hit = true;
      }
      break;
    }
    case 'climb': break;
    case 'bat': cat.vx = 0; batStep(); break;
    case 'settle': { // round and round, then kneading the spot before lying down
      cat.vx = 0;
      const turns = Math.min(3, Math.floor(cat.stateTime / 0.35));
      if (turns !== cat.turns) { cat.turns = turns; cat.dir *= -1; }
      if (cat.stateTime >= cat.dur) setState('sleep', cat.napFor);
      break;
    }
    case 'sleep':
      cat.vx = 0;
      // Wakes when the user returns, if the cat cares, with a stretch and a yawn.
      if (env.idle < 1 && interest() >= 2 && cat.stateTime > 3 && !isNight()) { setState('stretch', 2); }
      break;
    default: cat.vx = 0;
  }

  if (cat.state === 'climb') climbStep(dt);
  else physics(dt, w);
  keepCatVisible();
  lookAround(dt);

  cat.swat = Math.max(0, cat.swat - dt);
  updateToys(dt);
  if (cat.stateTime > cat.dur && !['jump', 'climb', 'ready', 'settle'].includes(cat.state)) { cat.vx = 0; decide(); }
}

// Eyes on whatever has the cat's attention, and a slow blink for a cursor resting quietly nearby.
function lookAround(dt) {
  const u = pixelCat.scale / 3, hunting = ['chase', 'stalk', 'ready'].includes(cat.state) || (cat.state === 'jump' && cat.landThen === 'chase');
  const yarn = toyOf('yarn'), cursor = env.cursor.x >= 0 ? env.cursor : null;
  const near = cursor && Math.hypot(cursor.x - cat.x, cursor.y - (cat.y - 20 * u)) < 300 * u;
  let target = null;
  if (cat.state === 'bat' && cat.bat) target = batTarget();
  else if (hunting) target = yarn && !toyOf('laser') ? { x: yarn.x, y: yarn.y - 12 } : cursor;
  else if (cat.state === 'toBowl' || cat.state === 'eat') target = toyOf('food');
  else if (cat.state === 'toCup') target = toyOf('cup');
  else if (cat.state === 'investigate' || (cursorSpeed > 2 && cursor && Math.hypot(cursor.x - cat.x, cursor.y - cat.y) < 800 * u)) target = cursor;
  if (target) { cat.look = { x: target.x - cat.x, y: target.y - cat.y }; cat.lookFor = 1.5; }
  else if ((cat.lookFor = (cat.lookFor || 0) - dt) <= 0) cat.look = null;

  const calm = (cat.state === 'sit' || cat.state === 'loaf') && near && cursorSpeed < 1;
  cat.calm = calm ? cat.calm + dt : 0;
  if (cat.blink > 0) cat.blink = Math.max(0, cat.blink - dt);
  else if (cat.calm > 2 && Math.random() < 0.25 * dt) cat.blink = 1.4;
}

// Gravity, landing on floors, and riding on top of the active window.
function physics(dt, w) {
  const prevY = cat.y;
  cat.vy += G * dt;
  cat.y += cat.vy * dt;
  cat.x = Math.max(pixelCat.padding, Math.min(env.width - pixelCat.padding, cat.x + cat.vx * dt));
  const fl = catFloorAt(cat.x, prevY);
  if (w && !cat.ignoreWin && cat.vy >= 0 && onWinRange(cat.x) && prevY <= w.y + 6 && cat.y >= w.y) {
    cat.y = w.y; cat.vy = 0; cat.onWindow = true; cat.air = false;
    land(3);
  } else if (cat.onWindow) {
    // Ride along with the window; fall if it moved away or the cat walked off its edge.
    if (w && onWinRange(cat.x)) { cat.y = w.y; cat.vy = 0; } else { cat.onWindow = false; }
  }
  if (!cat.onWindow && cat.y >= fl) {
    cat.y = fl; cat.vy = 0; cat.air = false; cat.ignoreWin = false;
    land(2);
  }
}

function updateToys(dt) {
  for (const t of toys) {
    if (t.kind === 'yarn' || t.kind === 'cup') {
      if (t.kind === 'cup' && !t.falling) continue;
      const prevY = t.y;
      t.vy += G * dt; t.x += t.vx * dt; t.y += t.vy * dt;
      // Floors are found from where the toy was, so it can't drop through onto a screen stacked right below.
      const fl = floorAt(t.x, prevY);
      if (t.y >= fl) {
        if (t.kind === 'cup') { t.dead = true; t.splat = { x: t.x, y: fl, life: 3 }; continue; }
        t.y = fl; t.vy *= -0.5; t.vx *= 0.8; if (Math.abs(t.vy) < 40) t.vy = 0;
      }
      if (t.x < 20 || t.x > env.width - 20) t.vx *= -1;
    }
    if (t.kind === 'laser') { t.life -= dt; if (t.life <= 0) t.dead = true; }
  }
  toys = toys.filter((t) => !t.dead);
  // A yarn ball that has stopped is boring after a while.
  const y = toyOf('yarn');
  if (y && Math.abs(y.vx) < 5 && y.vy === 0) { y.idle = (y.idle || 0) + dt; if (y.idle > 25) toys = toys.filter((t) => t !== y); } else if (y) y.idle = 0;
}

const splats = [];

// ---- drawing ----
function ell(x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }

function drawToys() {
  for (const t of toys) {
    if (t.kind === 'yarn') {
      ell(t.x, t.y - 12, 12, 12, '#d33'); ctx.strokeStyle = '#a11'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y - 12, 8, 0.5, 4); ctx.stroke();
    } else if (t.kind === 'laser') {
      ell(env.cursor.x, env.cursor.y, 6, 6, 'rgba(255,0,0,0.9)'); ell(env.cursor.x, env.cursor.y, 12, 12, 'rgba(255,0,0,0.25)');
    } else if (t.kind === 'food') {
      const y = t.y;
      ell(t.x, y - 6, 28, 8, '#4a8'); ell(t.x, y - 10, 22, 5, '#c84');
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText('•'.repeat(t.food), t.x - t.food * 3, y - 14);
    } else if (t.kind === 'cup') {
      ctx.fillStyle = '#eee'; ctx.fillRect(t.x - 9, t.y - 20, 18, 20); ctx.strokeStyle = '#999'; ctx.strokeRect(t.x - 9, t.y - 20, 18, 20);
    }
  }
}

function draw(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawToys();
  for (const t of toys) if (t.splat) splats.push(t.splat);
  toys.forEach((t) => delete t.splat);
  for (let i = splats.length - 1; i >= 0; i--) {
    const p = splats[i]; p.life -= dt;
    if (p.life <= 0) { splats.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = '#ddd';
    for (let k = 0; k < 6; k++) ctx.fillRect(p.x - 18 + k * 7, p.y - 3, 5, 3);
    ctx.globalAlpha = 1;
  }
  pixelCat.draw(ctx, cat);
}

// ---- right-click menu ----
// The overlay lets clicks through everywhere except over the cat itself, which can be right-clicked for the menu.
// While the pointer is over the cat the overlay gets mouse events, so it can tell at once when the pointer leaves.
let pointer = null, overCat = false;
addEventListener('mousemove', (e) => { pointer = { x: e.clientX, y: e.clientY, at: performance.now() }; });
addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (pixelCat.hit(cat, e.clientX, e.clientY)) window.catApi.showCatMenu();
});
function updateHover() {
  const p = pointer && performance.now() - pointer.at < 100 ? pointer : env.cursor;
  const over = p.x >= 0 && pixelCat.hit(cat, p.x, p.y);
  if (over !== overCat) { overCat = over; window.catApi.setCatHover(over); }
}

let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (canvas.width !== env.width || canvas.height !== env.height) { canvas.width = env.width; canvas.height = env.height; }
  update(dt); draw(dt); updateHover(); requestAnimationFrame(loop);
})(last);
