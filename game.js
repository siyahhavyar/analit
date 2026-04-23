const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hudStats = document.getElementById('hudStats');
const hudSpells = document.getElementById('hudSpells');

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const state = {
  time: 0,
  lastTs: performance.now(),
  enemySpawnCd: 0,
  player: {
    x: W / 2,
    y: H / 2,
    r: 16,
    hp: 100,
    maxHp: 100,
    speed: 250,
    level: 1,
    xp: 0,
    nextXp: 8,
    invuln: 0,
  },
  enemies: [],
  projectiles: [],
  shards: [],
  rings: [],
};

const spells = {
  arcaneBolt: {
    name: 'Arcane Bolt',
    level: 1,
    cooldown: 0,
    baseCd: 0.45,
  },
  novaRing: {
    name: 'Nova Ring',
    level: 0,
    cooldown: 0,
    baseCd: 3.5,
  },
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = rand(0, W);
    y = -20;
  } else if (edge === 1) {
    x = W + 20;
    y = rand(0, H);
  } else if (edge === 2) {
    x = rand(0, W);
    y = H + 20;
  } else {
    x = -20;
    y = rand(0, H);
  }

  const t = Math.min(1 + state.time / 60, 3);
  state.enemies.push({
    x,
    y,
    r: rand(10, 15),
    hp: Math.floor(rand(12, 20) * t),
    speed: rand(55, 85) * (0.85 + state.time / 140),
    dmg: 8,
  });
}

function nearestEnemy() {
  if (state.enemies.length === 0) return null;
  let best = state.enemies[0];
  let bestD = dist(state.player, best);
  for (let i = 1; i < state.enemies.length; i++) {
    const d = dist(state.player, state.enemies[i]);
    if (d < bestD) {
      bestD = d;
      best = state.enemies[i];
    }
  }
  return best;
}

function castArcaneBolt() {
  const target = nearestEnemy();
  if (!target) return;
  const ang = Math.atan2(target.y - state.player.y, target.x - state.player.x);
  const speed = 420;
  const lv = spells.arcaneBolt.level;
  for (let i = 0; i < Math.min(1 + Math.floor(lv / 3), 3); i++) {
    const spread = (i - (Math.min(1 + Math.floor(lv / 3), 3) - 1) / 2) * 0.15;
    state.projectiles.push({
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(ang + spread) * speed,
      vy: Math.sin(ang + spread) * speed,
      r: 4,
      life: 1.6,
      dmg: 8 + lv * 3,
    });
  }
}

function castNovaRing() {
  const lv = spells.novaRing.level;
  if (lv <= 0) return;
  state.rings.push({
    x: state.player.x,
    y: state.player.y,
    radius: 0,
    maxRadius: 120 + lv * 35,
    speed: 460,
    width: 16,
    dmg: 14 + lv * 5,
    hit: new Set(),
  });
}

function gainXp(amount) {
  const p = state.player;
  p.xp += amount;
  while (p.xp >= p.nextXp) {
    p.xp -= p.nextXp;
    p.level += 1;
    p.nextXp = Math.floor(p.nextXp * 1.3 + 3);
    p.maxHp += 8;
    p.hp = Math.min(p.maxHp, p.hp + 18);
    levelUpReward();
  }
}

function levelUpReward() {
  if (spells.novaRing.level === 0 && state.player.level >= 3) {
    spells.novaRing.level = 1;
    return;
  }
  if (Math.random() < 0.5) {
    spells.arcaneBolt.level += 1;
  } else {
    spells.novaRing.level = Math.min(spells.novaRing.level + 1, 4);
  }
}

function update(dt) {
  state.time += dt;
  const p = state.player;

  let dx = 0;
  let dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    p.x += (dx / len) * p.speed * dt;
    p.y += (dy / len) * p.speed * dt;
  }

  p.x = Math.max(p.r, Math.min(W - p.r, p.x));
  p.y = Math.max(p.r, Math.min(H - p.r, p.y));
  p.invuln = Math.max(0, p.invuln - dt);

  state.enemySpawnCd -= dt;
  if (state.enemySpawnCd <= 0) {
    const intensity = Math.max(0.35, 1.2 - state.time / 140);
    state.enemySpawnCd = intensity;
    spawnEnemy();
    if (state.time > 30 && Math.random() < 0.25) spawnEnemy();
  }

  spells.arcaneBolt.cooldown -= dt;
  if (spells.arcaneBolt.cooldown <= 0) {
    castArcaneBolt();
    spells.arcaneBolt.cooldown = Math.max(0.12, spells.arcaneBolt.baseCd - spells.arcaneBolt.level * 0.03);
  }

  spells.novaRing.cooldown -= dt;
  if (spells.novaRing.cooldown <= 0 && spells.novaRing.level > 0) {
    castNovaRing();
    spells.novaRing.cooldown = Math.max(1.3, spells.novaRing.baseCd - spells.novaRing.level * 0.35);
  }

  for (const e of state.enemies) {
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.x += Math.cos(ang) * e.speed * dt;
    e.y += Math.sin(ang) * e.speed * dt;

    if (dist(e, p) < e.r + p.r && p.invuln <= 0) {
      p.hp -= e.dmg;
      p.invuln = 0.5;
      if (p.hp <= 0) {
        p.hp = p.maxHp;
        p.level = 1;
        p.xp = 0;
        p.nextXp = 8;
        state.enemies.length = 0;
        state.projectiles.length = 0;
        state.shards.length = 0;
        state.rings.length = 0;
        spells.arcaneBolt.level = 1;
        spells.novaRing.level = 0;
        state.time = 0;
      }
    }
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const b = state.projectiles[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    let removed = false;
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (dist(b, e) <= b.r + e.r) {
        e.hp -= b.dmg;
        state.projectiles.splice(i, 1);
        removed = true;
        if (e.hp <= 0) {
          state.shards.push({ x: e.x, y: e.y, r: 5, xp: 1 + Math.floor(Math.random() * 2) });
          state.enemies.splice(j, 1);
        }
        break;
      }
    }

    if (!removed && (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20)) {
      state.projectiles.splice(i, 1);
    }
  }

  for (const ring of state.rings) {
    ring.radius += ring.speed * dt;
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const d = dist(ring, e);
      if (Math.abs(d - ring.radius) < ring.width && !ring.hit.has(e)) {
        ring.hit.add(e);
        e.hp -= ring.dmg;
        if (e.hp <= 0) {
          state.shards.push({ x: e.x, y: e.y, r: 5, xp: 2 });
          state.enemies.splice(i, 1);
        }
      }
    }
  }
  state.rings = state.rings.filter((r) => r.radius < r.maxRadius);

  for (let i = state.shards.length - 1; i >= 0; i--) {
    const s = state.shards[i];
    const d = dist(s, p);
    if (d < 120) {
      const ang = Math.atan2(p.y - s.y, p.x - s.x);
      s.x += Math.cos(ang) * (160 + (120 - d) * 2) * dt;
      s.y += Math.sin(ang) * (160 + (120 - d) * 2) * dt;
    }
    if (d < s.r + p.r) {
      gainXp(s.xp);
      state.shards.splice(i, 1);
    }
  }

  hudStats.textContent = `Seviye ${p.level} • XP ${p.xp}/${p.nextXp} • Can ${Math.max(0, Math.floor(p.hp))}`;
  const unlocked = [
    `${spells.arcaneBolt.name} Lv.${spells.arcaneBolt.level}`,
    ...(spells.novaRing.level > 0 ? [`${spells.novaRing.name} Lv.${spells.novaRing.level}`] : []),
  ];
  hudSpells.textContent = `Büyüler: ${unlocked.join(' | ')}`;
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(117, 144, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();

  for (const s of state.shards) {
    ctx.fillStyle = '#74f0ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) {
    ctx.fillStyle = '#ff4f79';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of state.projectiles) {
    ctx.fillStyle = '#98a7ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ring of state.rings) {
    ctx.strokeStyle = 'rgba(121, 138, 255, 0.7)';
    ctx.lineWidth = ring.width;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = state.player.invuln > 0 ? '#ffe57f' : '#7ff0c8';
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
  ctx.fill();

  const hpRatio = state.player.hp / state.player.maxHp;
  ctx.fillStyle = 'rgba(20, 24, 36, 0.9)';
  ctx.fillRect(20, 20, 220, 16);
  ctx.fillStyle = '#ff6584';
  ctx.fillRect(20, 20, 220 * Math.max(0, hpRatio), 16);
  ctx.strokeStyle = '#ffffff44';
  ctx.strokeRect(20, 20, 220, 16);

  ctx.fillStyle = '#ecf0ff';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Süre: ${Math.floor(state.time)}s`, W - 95, 30);
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - state.lastTs) / 1000);
  state.lastTs = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
