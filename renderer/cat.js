const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth; canvas.height = innerHeight;

let settings = { interest: 2, nightSleep: true };
let env = { cursor: { x: -1, y: -1 }, idle: 0, typing: false, hour: 12, width: innerWidth, height: innerHeight,
  floors: [{ x0: 0, x1: innerWidth, y: innerHeight - 40 }], active: null };
let prevCursor = null, cursorSpeed = 0, displayLayout = null;
window.catApi.onSettings((s) => { settings = s; });
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
const speed = () => [60, 80, 110, 160, 240][interest()];
const rand = (a, b) => a + Math.random() * (b - a);
const isNight = () => settings.nightSleep && (env.hour >= 23 || env.hour < 7);

// ---- world ----
const cat = { x: 300, y: 0, vx: 0, vy: 0, dir: 1, state: 'sit', t: 0, stateTime: 0, dur: 3, onWindow: false, air: false, swat: 0 };
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

function keepCatVisible() {
  const left = Math.round(cat.x) - pixelCat.padding, right = Math.round(cat.x) + pixelCat.padding;
  const top = Math.round(cat.y) - pixelCat.height, bottom = Math.round(cat.y);
  const edges = [left, right, ...env.floors.flatMap((f) => [f.x0, f.x1]).filter((x) => x > left && x < right)].sort((a, b) => a - b);
  const fits = edges.slice(1).every((edge, i) => {
    const x = (edges[i] + edge) / 2;
    let covered = top;
    for (const f of env.floors.filter((f) => x >= f.x0 && x < f.x1).sort((a, b) => (a.top ?? 0) - (b.top ?? 0))) {
      if ((f.top ?? 0) > covered) break;
      covered = Math.max(covered, f.y);
    }
    return covered >= bottom;
  });
  if (fits) return;
  const positions = env.floors.filter((f) => f.x1 - f.x0 >= pixelCat.padding * 2 && f.y - (f.top ?? 0) >= pixelCat.height).map((f) => ({
    x: Math.max(Math.ceil(f.x0) + pixelCat.padding, Math.min(Math.floor(f.x1) - pixelCat.padding, cat.x)),
    y: Math.max(Math.ceil(f.top ?? 0) + pixelCat.height, Math.min(f.y, cat.y)),
  }));
  const nearest = positions.sort((a, b) => Math.hypot(a.x - cat.x, a.y - cat.y) - Math.hypot(b.x - cat.x, b.y - cat.y))[0];
  if (!nearest) return;
  if (nearest.x !== cat.x && cat.state === 'walk') cat.dir *= -1;
  if (nearest.y !== cat.y) { cat.vy = 0; cat.air = false; }
  cat.x = nearest.x; cat.y = nearest.y; cat.onWindow = false;
}

function setState(s, dur) { cat.state = s; cat.stateTime = 0; cat.dur = dur ?? rand(2, 5); }
function jump(vy, vx = 0) { cat.vy = vy; cat.vx = vx; cat.air = true; cat.onWindow = false; setState('jump', 3); }
function placeCat(point) {
  const home = env.floors.find((f) => f.primary) || env.floors[0];
  Object.assign(cat, {
    x: point ? point.x : (home.x0 + home.x1) / 2, y: point ? point.y : home.y,
    vx: 0, vy: 0, air: false, onWindow: false, ignoreWin: false, swat: 0,
  });
  setState('sit', 5);
}
window.catApi.onSummon(placeCat);

window.catApi.onToy((kind) => {
  if (kind === 'yarn') toys.push({ kind, x: env.cursor.x > 0 ? env.cursor.x : 600, y: 100, vx: rand(-200, 200), vy: 0 });
  else if (kind === 'laser') toys.push({ kind, life: 20 });
  else if (kind === 'food') toys.push({ kind, x: Math.max(80, Math.min(env.width - 80, cat.x + rand(-400, 400))), food: 5 });
});

const toyOf = (k) => toys.find((t) => t.kind === k);
function chaseTarget() {
  if (toyOf('laser')) return { x: env.cursor.x, why: 'laser' };
  const y = toyOf('yarn'); if (y) return { x: y.x, why: 'yarn' };
  return null;
}

function decide() {
  const lvl = interest();
  const awake = env.idle < 20;
  const hungryBowl = toyOf('food');
  if (hungryBowl && lvl > 0) { setState('toBowl', 8); return; }
  const toy = lvl > 0 && chaseTarget();
  if (toy) { setState('chase', rand(4, 8)); return; }
  if (isNight() && lvl < 4) return setState('sleep', rand(30, 60));
  if (!awake && lvl < 4) return setState(Math.random() < 0.3 ? 'lick' : 'sleep', rand(15, 40));
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
  const r = Math.random();
  if (r < 0.3) setState('lick', rand(3, 6));
  else if (r < 0.55) { setState('walk', rand(2, 5)); cat.dir = Math.random() < 0.5 ? -1 : 1; }
  else if (r < 0.7) setState('stretch', 2);
  else if (r < 0.8) setState('sleep', rand(15, 30));
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
  const c = env.cursor, w = winTop();

  switch (cat.state) {
    case 'walk':
      if (cat.onWindow) { if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1; }
      else if ((cat.dir < 0 && cat.x <= pixelCat.padding) || (cat.dir > 0 && cat.x >= env.width - pixelCat.padding)) cat.dir *= -1;
      cat.vx = cat.dir * speed() * 0.6;
      break;
    case 'investigate': moveToward(c.x, 160); break;
    case 'chase': {
      const t = chaseTarget();
      const tx = t ? t.x : c.x;
      const near = moveToward(tx, t ? 30 : 40);
      if (near && ((t && t.why === 'laser') || (!t && cursorSpeed > 12) || (t && t.why === 'yarn' && Math.random() < 0.05))) {
        if (t && t.why === 'yarn') { cat.swat = 0.4; const y = toyOf('yarn'); y.vx = cat.dir * rand(300, 600); y.vy = -rand(200, 500); setState('chase', 6); }
        else { jump(-420, cat.dir * speed() * 0.8); }
      }
      break;
    }
    case 'toWindow':
      if (!w) { setState('sit', 2); break; }
      if (cat.onWindow) { setState('sit', 3); break; }
      if (!onWinRange(cat.x)) moveToward(Math.max(w.x + 40, Math.min(w.x + w.width - 40, cat.x)), 5);
      else {
        const h = catFloorAt() - w.y;
        if (h > 0 && h < 650) { cat.vx = 0; jump(-Math.sqrt(2 * G * (h + 50))); }
        else setState('sit', 2);
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
    case 'jump': break;
    case 'sleep':
      cat.vx = 0;
      // Wakes when the user returns, if the cat cares.
      if (env.idle < 1 && interest() >= 2 && cat.stateTime > 3 && !isNight()) { setState('sit', 2); }
      break;
    default: cat.vx = 0;
  }

  // Physics: surface is either the floor or the active window's top edge.
  const prevY = cat.y;
  cat.vy += G * dt;
  cat.y += cat.vy * dt;
  cat.x = Math.max(pixelCat.padding, Math.min(env.width - pixelCat.padding, cat.x + cat.vx * dt));
  const fl = catFloorAt(cat.x, prevY);
  if (w && !cat.ignoreWin && cat.vy >= 0 && onWinRange(cat.x) && prevY <= w.y + 6 && cat.y >= w.y) {
    cat.y = w.y; cat.vy = 0; cat.onWindow = true; cat.air = false;
    if (cat.state === 'jump') setState('sit', 3);
  } else if (cat.onWindow) {
    // Ride along with the window; fall if it moved away or the cat walked off its edge.
    if (w && onWinRange(cat.x)) { cat.y = w.y; cat.vy = 0; } else { cat.onWindow = false; }
  }
  if (!cat.onWindow && cat.y >= fl) {
    cat.y = fl; cat.vy = 0; cat.air = false; cat.ignoreWin = false;
    if (cat.state === 'jump') setState('sit', 2);
  }
  keepCatVisible();

  cat.swat = Math.max(0, cat.swat - dt);
  updateToys(dt);
  if (cat.stateTime > cat.dur && cat.state !== 'jump') { cat.vx = 0; decide(); }
}

function updateToys(dt) {
  for (const t of toys) {
    if (t.kind === 'yarn' || t.kind === 'cup') {
      if (t.kind === 'cup' && !t.falling) continue;
      t.vy += G * dt; t.x += t.vx * dt; t.y += t.vy * dt;
      const fl = floorAt(t.x, t.y);
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
      const y = floorAt(t.x);
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

let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (canvas.width !== env.width || canvas.height !== env.height) { canvas.width = env.width; canvas.height = env.height; }
  update(dt); draw(dt); requestAnimationFrame(loop);
})(last);
