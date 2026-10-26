const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth; canvas.height = innerHeight;

let settings = { interest: 2, sound: true, nightSleep: true };
let env = { cursor: { x: -1, y: -1 }, idle: 0, typing: false, hour: 12, width: innerWidth, height: innerHeight,
  floors: [{ x0: 0, x1: innerWidth, y: innerHeight - 40 }], active: null };
let prevCursor = null, cursorSpeed = 0;
window.catApi.onSettings((s) => { settings = s; });
window.catApi.onEnv((e) => {
  if (prevCursor) cursorSpeed = Math.hypot(e.cursor.x - prevCursor.x, e.cursor.y - prevCursor.y);
  prevCursor = e.cursor; env = e;
});

const G = 1400;
const interest = () => settings.interest;
const reactChance = () => [0, 0.05, 0.3, 0.6, 1][interest()];
const speed = () => [60, 80, 110, 160, 240][interest()];
const rand = (a, b) => a + Math.random() * (b - a);
const isNight = () => settings.nightSleep && (env.hour >= 23 || env.hour < 7);

// ---- sound (synthesised, no assets) ----
let audio;
function tone(fn) { if (!settings.sound) return; audio = audio || new AudioContext(); if (audio.state === 'suspended') audio.resume(); fn(audio); }
function meow() {
  tone((a) => {
    const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(), t = a.currentTime;
    o.type = 'sawtooth'; f.type = 'bandpass'; f.Q.value = 3;
    o.frequency.setValueAtTime(500, t); o.frequency.linearRampToValueAtTime(850, t + 0.15); o.frequency.linearRampToValueAtTime(450, t + 0.6);
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.2); f.frequency.linearRampToValueAtTime(900, t + 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.08, t + 0.08); g.gain.linearRampToValueAtTime(0, t + 0.65);
    o.connect(f).connect(g).connect(a.destination); o.start(t); o.stop(t + 0.7);
  });
}
let purring = null;
function setPurr(on) {
  if (on && !purring && settings.sound) {
    tone((a) => {
      const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      o.type = 'sawtooth'; o.frequency.value = 26; lfo.frequency.value = 22; lg.gain.value = 0.015; g.gain.value = 0.02;
      lfo.connect(lg).connect(g.gain); o.connect(g).connect(a.destination); o.start(); lfo.start();
      purring = { stop: () => { o.stop(); lfo.stop(); } };
    });
  } else if (!on && purring) { purring.stop(); purring = null; }
}

// ---- world ----
const cat = { x: 300, y: 0, vx: 0, vy: 0, dir: 1, state: 'sit', t: 0, stateTime: 0, dur: 3, onWindow: false, air: false, swat: 0 };
let toys = []; // yarn, bowl, cup, laser
const floorAt = (x) => { const f = env.floors.find((f) => x >= f.x0 && x <= f.x1) || env.floors[0]; return f.y; };
const winTop = () => (env.active && env.active.y > 50 && env.active.width > 200 ? env.active : null);
const onWinRange = (x) => { const w = winTop(); return w && x > w.x + 10 && x < w.x + w.width - 10; };
cat.y = floorAt(cat.x);

function setState(s, dur) { cat.state = s; cat.stateTime = 0; cat.dur = dur ?? rand(2, 5); }
function jump(vy, vx = 0) { cat.vy = vy; cat.vx = vx; cat.air = true; cat.onWindow = false; setState('jump', 3); }

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
      cat.vx = cat.dir * speed() * 0.6;
      if (cat.onWindow) { if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1; }
      else if (cat.x < 60 || cat.x > env.width - 60) cat.dir *= -1;
      break;
    case 'investigate': moveToward(c.x, 160); break;
    case 'chase': {
      const t = chaseTarget();
      const tx = t ? t.x : c.x;
      const near = moveToward(tx, t ? 30 : 40);
      if (near && ((t && t.why === 'laser') || (!t && cursorSpeed > 12) || (t && t.why === 'yarn' && Math.random() < 0.05))) {
        if (t && t.why === 'yarn') { cat.swat = 0.4; const y = toyOf('yarn'); y.vx = cat.dir * rand(300, 600); y.vy = -rand(200, 500); meow(); setState('chase', 6); }
        else { meow(); jump(-420, cat.dir * speed() * 0.8); }
      }
      break;
    }
    case 'toWindow':
      if (!w) { setState('sit', 2); break; }
      if (cat.onWindow) { setState('sit', 3); break; }
      if (!onWinRange(cat.x)) moveToward(Math.max(w.x + 40, Math.min(w.x + w.width - 40, cat.x)), 5);
      else {
        const h = floorAt(cat.x) - w.y;
        if (h > 0 && h < 650) { cat.vx = 0; jump(-Math.sqrt(2 * G * (h + 50))); meow(); }
        else setState('sit', 2);
      }
      break;
    case 'hopDown': cat.onWindow = false; cat.ignoreWin = true; cat.vx = cat.dir * 60; break;
    case 'helpType': // paces across the window the user is typing in
      cat.vx = cat.dir * speed() * 0.5;
      if (!onWinRange(cat.x + cat.dir * 20)) cat.dir *= -1;
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
        cat.swat = 0.5; cup.falling = true; cup.vx = 120; meow();
        setState('smug', 3);
      }
      break;
    }
    case 'jump': break;
    case 'sleep':
      cat.vx = 0;
      // Wakes when the user returns, if the cat cares.
      if (env.idle < 1 && interest() >= 2 && cat.stateTime > 3 && !isNight()) { setState('sit', 2); meow(); }
      break;
    default: cat.vx = 0;
  }

  // Physics: surface is either the floor or the active window's top edge.
  const prevY = cat.y;
  cat.vy += G * dt;
  cat.y += cat.vy * dt;
  cat.x = Math.max(30, Math.min(env.width - 30, cat.x + cat.vx * dt));
  const fl = floorAt(cat.x);
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

  cat.swat = Math.max(0, cat.swat - dt);
  setPurr(['sit', 'lick', 'sleep'].includes(cat.state) && Math.hypot(c.x - cat.x, c.y - cat.y) < 250 && interest() >= 2);

  updateToys(dt);
  if (cat.stateTime > cat.dur && cat.state !== 'jump') { cat.vx = 0; decide(); }
}

function updateToys(dt) {
  for (const t of toys) {
    if (t.kind === 'yarn' || t.kind === 'cup') {
      if (t.kind === 'cup' && !t.falling) continue;
      t.vy += G * dt; t.x += t.vx * dt; t.y += t.vy * dt;
      const fl = floorAt(t.x);
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

function drawCat() {
  const s = 1.4, moving = Math.abs(cat.vx) > 1, sleeping = cat.state === 'sleep';
  const lick = cat.state === 'lick', eat = cat.state === 'eat', stretch = cat.state === 'stretch', airborne = cat.air || cat.vy < -1;
  ctx.save();
  ctx.translate(cat.x, cat.y);
  ctx.scale(cat.dir * s, s);
  const body = '#e8a05a', dark = '#b9742f';
  const bob = moving ? Math.sin(cat.t * 14) * 2 : sleeping ? Math.sin(cat.t * 2) : 0;
  const wag = Math.sin(cat.t * (cat.state === 'smug' ? 8 : 3));
  ctx.strokeStyle = dark; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-30, -20 + bob);
  ctx.quadraticCurveTo(-55, -30 + wag * 12, -50, -60 + wag * 8 + (stretch ? -10 : 0)); ctx.stroke();
  const leg = moving ? Math.sin(cat.t * 14) * 6 : 0;
  ell(-18 + leg, airborne ? -6 : 0, 7, 6, dark); ell(18 - leg, airborne ? -6 : 0, 7, 6, dark);
  if (sleeping) ell(0, -14, 38, 16, body);
  else if (stretch) { ctx.save(); ctx.rotate(-0.25); ell(5, -22, 36, 17, body); ctx.restore(); }
  else ell(0, -24 + bob, 32, 20, body);
  const hx = sleeping ? 26 : stretch ? 40 : 30;
  const hy = sleeping ? -14 : lick ? -30 : eat ? -22 : stretch ? -22 : -48 + bob;
  ell(hx, hy, 17, 15, body);
  ctx.fillStyle = body;
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + sx * 5, hy - 10); ctx.lineTo(hx + sx * 15, hy - 24); ctx.lineTo(hx + sx * 17, hy - 6); ctx.fill(); }
  ctx.fillStyle = '#222';
  if (sleeping || eat || stretch) { ctx.fillRect(hx - 8, hy - 2, 6, 2); ctx.fillRect(hx + 4, hy - 2, 6, 2); }
  else { ell(hx - 5, hy - 3, 2.5, 3.5, '#222'); ell(hx + 5, hy - 3, 2.5, 3.5, '#222'); }
  ell(hx, hy + 3, 2, 1.5, '#d66');
  if (lick) ell(hx - 6, hy + 14, 4, 6 + Math.sin(cat.t * 10) * 2, '#f88');
  if (cat.swat > 0) { ctx.save(); ctx.translate(30, -30); ctx.rotate(-1 + (0.5 - cat.swat) * 3); ell(14, 0, 14, 5, dark); ctx.restore(); }
  ctx.restore();
  if (sleeping) {
    const o = (cat.t * 20) % 30;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.globalAlpha = 1 - o / 30;
    ctx.fillText('z', cat.x + 30, cat.y - 60 - o); ctx.globalAlpha = 1;
  }
  if (cat.state === 'smug') { ctx.font = '18px sans-serif'; ctx.fillText('😼', cat.x - 10, cat.y - 90); }
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
  drawCat();
}

let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (canvas.width !== env.width || canvas.height !== env.height) { canvas.width = env.width; canvas.height = env.height; }
  update(dt); draw(dt); requestAnimationFrame(loop);
})(last);
