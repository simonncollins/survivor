// ============================================================
// Survivor — HTML5 Canvas Survival Game
// ============================================================

// --------------- Constants ---------------
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const PLAYER_RADIUS = 16;
const PLAYER_COLOR = '#4488ff';
const PLAYER_SPEED = 200;
const BG_COLOR = '#111111';
const GRID_COLOR = '#1a1a1a';
const GRID_SIZE = 80;

// Enemy
const ENEMY_RADIUS = 12;
const ENEMY_COLOR = '#ff4444';
const ENEMY_BASE_SPEED = 80;
const ENEMY_BASE_HP = 30;
const ENEMY_SPAWN_MARGIN = 60;
const BASE_SPAWN_INTERVAL = 2.0;
const MIN_SPAWN_INTERVAL = 0.3;
const SPAWN_RAMP_TIME = 300; // seconds to reach min interval

// Combat
const CONTACT_BASE_DPS = 10;
const IFRAME_DURATION = 1.5;
const PLAYER_MAX_HP = 100;

// Projectile — Magic Bolt
const MAGIC_BOLT_SPEED = 400;
const MAGIC_BOLT_RADIUS = 5;
const MAGIC_BOLT_DAMAGE = 15;
const MAGIC_BOLT_RANGE = 600;
const MAGIC_BOLT_COOLDOWN = 1.2;

// Projectile — Piercing Bolt (#7)
const PIERCING_BOLT_SPEED = 350;
const PIERCING_BOLT_RADIUS = 6;
const PIERCING_BOLT_DAMAGE = 20;
const PIERCING_BOLT_RANGE = 800;
const PIERCING_BOLT_COOLDOWN = 2.0;
const PIERCING_BOLT_MAX_PIERCE = 3;

// Orbit Shield (#11)
const ORBIT_ORB_COUNT = 4;
const ORBIT_RADIUS = 60;
const ORBIT_ORB_RADIUS = 10;
const ORBIT_PERIOD = 2.0;
const ORBIT_DAMAGE = 25;
const ORBIT_HIT_COOLDOWN = 0.5;
const ORBIT_COLOR = '#aa66ff';

// Bouncing Spark (#13)
const SPARK_SPEED = 250;
const SPARK_RADIUS = 5;
const SPARK_DAMAGE = 18;
const SPARK_RANGE = 500;
const SPARK_COOLDOWN = 1.8;
const SPARK_MAX_BOUNCES = 3;
const SPARK_COLOR = '#44ffff';

// XP
const XP_GEM_RADIUS = 6;
const XP_GEM_COLOR = '#ffdd44';
const XP_BASE_VALUE = 5;
const XP_GEM_MAGNET_RANGE = 120;
const XP_GEM_MAGNET_SPEED = 300;

// Level thresholds (#9)
const XP_THRESHOLDS = [10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// Powerup card layout (#10)
const CARD_WIDTH = 200;
const CARD_HEIGHT = 250;
const CARD_GAP = 30;
const CARD_COUNT = 3;

// Particles (#16)
const DAMAGE_NUMBER_LIFETIME = 0.8;
const DEATH_PARTICLE_COUNT_MIN = 6;
const DEATH_PARTICLE_COUNT_MAX = 8;
const DEATH_PARTICLE_LIFETIME = 0.5;
const XP_BURST_COUNT = 3;

// Screen shake (#17)
const SHAKE_MAGNITUDE = 8;
const SHAKE_DURATION = 0.3;

// Enemy Soft Collision (#29)
const ENEMY_SEPARATION_FORCE = 0.4;
const ENEMY_OVERLAP_THRESHOLD = 0.5; // fraction of smaller radius before repulsion

// --------------- Canvas Setup ---------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isPortrait = false;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isPortrait = window.innerWidth < window.innerHeight;
}
window.addEventListener('resize', function() {
    resizeCanvas();
    if (game && game.state === 'PAUSED_LEVELUP' && levelUpCards.length > 0) {
        var savedPowerups = levelUpCards.map(function(c) { return c.powerup; });
        generateLevelUpCardsFromPowerups(savedPowerups);
    }
});
resizeCanvas();

// --------------- Sound Manager (Web Audio API) (#28) ---------------
const Sound = (function() {
    let audioCtx = null;
    let muted = false;

    function ensureContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, duration, type, volume, freqEnd) {
        if (muted) return;
        const ctx = ensureContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * freq * 0.08, ctx.currentTime);
        if (freqEnd !== undefined) {
            osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
        }
        gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    return {
        init: function() { ensureContext(); },
        isMuted: function() { return muted; },
        toggleMute: function() { muted = !muted; return muted; },

        playAttack: function() {
            playTone(800, 0.08, 'square', 0.1, 400);
        },
        playEnemyDeath: function() {
            playTone(300, 0.12, 'square', 0.12, 80);
            playTone(200, 0.08, 'sawtooth', 0.06, 60);
        },
        playXpPickup: function() {
            playTone(1200, 0.06, 'sine', 0.08, 1600);
        },
        playLevelUp: function() {
            if (muted) return;
            const ctx = ensureContext();
            const notes = [523, 659, 784, 1047];
            notes.forEach(function(freq, i) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
                gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.2);
            });
        },
        playChestOpen: function() {
            playTone(400, 0.15, 'sine', 0.12, 900);
            playTone(600, 0.2, 'sine', 0.08, 1200);
        },
        playDamage: function() {
            playTone(150, 0.15, 'sawtooth', 0.12, 80);
        },
    };
})();

// --------------- Utility / Collision Helpers (#8) ---------------
function circleDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function circlesOverlap(a, b) {
    return circleDistance(a, b) < a.radius + b.radius;
}

function normalize(dx, dy) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(randRange(min, max + 1));
}

// --------------- Spatial Grid (#8) ---------------
const GRID_CELL_SIZE = 64;

function spatialHash(x, y) {
    const cx = Math.floor(x / GRID_CELL_SIZE);
    const cy = Math.floor(y / GRID_CELL_SIZE);
    return cx + ',' + cy;
}

function buildSpatialGrid(entities) {
    const grid = {};
    for (let i = 0; i < entities.length; i++) {
        const e = entities[i];
        const minCx = Math.floor((e.x - e.radius) / GRID_CELL_SIZE);
        const maxCx = Math.floor((e.x + e.radius) / GRID_CELL_SIZE);
        const minCy = Math.floor((e.y - e.radius) / GRID_CELL_SIZE);
        const maxCy = Math.floor((e.y + e.radius) / GRID_CELL_SIZE);
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = cx + ',' + cy;
                if (!grid[key]) grid[key] = [];
                grid[key].push(i);
            }
        }
    }
    return grid;
}

function queryNearby(grid, x, y, radius) {
    const indices = new Set();
    const minCx = Math.floor((x - radius) / GRID_CELL_SIZE);
    const maxCx = Math.floor((x + radius) / GRID_CELL_SIZE);
    const minCy = Math.floor((y - radius) / GRID_CELL_SIZE);
    const maxCy = Math.floor((y + radius) / GRID_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
            const key = cx + ',' + cy;
            if (grid[key]) {
                for (const idx of grid[key]) {
                    indices.add(idx);
                }
            }
        }
    }
    return indices;
}

// --------------- Difficulty Scaling (#12) ---------------
function getScaledValue(base, time, divisor) {
    return base * (1 + time / divisor);
}

function getSpawnInterval(time) {
    const t = Math.min(time / SPAWN_RAMP_TIME, 1);
    return lerp(BASE_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, t);
}

// --------------- Object Pools (#18) ---------------
function createPool(factory, initialSize) {
    const pool = [];
    const active = [];
    for (let i = 0; i < initialSize; i++) {
        pool.push(factory());
    }
    return {
        pool: pool,
        active: active,
        acquire: function() {
            let obj;
            if (pool.length > 0) {
                obj = pool.pop();
            } else {
                obj = factory();
            }
            active.push(obj);
            return obj;
        },
        release: function(idx) {
            const obj = active.splice(idx, 1)[0];
            pool.push(obj);
            return obj;
        },
        releaseAll: function() {
            while (active.length > 0) {
                pool.push(active.pop());
            }
        },
    };
}

// --------------- Powerup Registry (#10) ---------------
const POWERUPS = [
    {
        name: 'Damage Up',
        description: '+15% all weapon damage',
        color: '#ff6644',
        apply: function() { player.damageMultiplier *= 1.15; },
    },
    {
        name: 'Fire Rate Up',
        description: '+15% all fire rates',
        color: '#ff44ff',
        apply: function() { player.fireRateMultiplier *= 1.15; },
    },
    {
        name: 'Move Speed Up',
        description: '+10% player speed',
        color: '#44ffff',
        apply: function() { player.speed *= 1.10; },
    },
    {
        name: 'Max HP Up',
        description: '+25 max HP, heal 25',
        color: '#44ff44',
        apply: function() {
            player.maxHp += 25;
            player.hp = Math.min(player.hp + 25, player.maxHp);
        },
    },
    {
        name: 'Piercing Bolt',
        description: 'Adds piercing bolt weapon',
        color: '#ff8844',
        apply: function() {
            if (!player.weapons.includes('piercing_bolt')) {
                player.weapons.push('piercing_bolt');
            }
        },
    },
    {
        name: 'Orbit Shield',
        description: 'Adds orbit shield weapon',
        color: ORBIT_COLOR,
        apply: function() {
            if (!player.weapons.includes('orbit_shield')) {
                player.weapons.push('orbit_shield');
            }
        },
    },
    {
        name: 'Bouncing Spark',
        description: 'Adds bouncing spark weapon',
        color: SPARK_COLOR,
        apply: function() {
            if (!player.weapons.includes('bouncing_spark')) {
                player.weapons.push('bouncing_spark');
            }
        },
    },
];

// --------------- Game State ---------------
let game, player, enemies, projectiles, xpGems, particles, levelUpCards;
let selectedPowerupIndex = -1;
let levelUpOpenTime = 0;
let enemyIdCounter = 0;

function resetGameState() {
    game = {
        state: 'MENU', // MENU, PLAYING, PAUSED_LEVELUP, GAME_OVER
        lastTime: 0,
        camera: { x: 0, y: 0 },
        enemySpawnTimer: 0,
        survivalTime: 0,
        killCount: 0,
        shakeTimer: 0,
        shakeMagnitude: 0,
        weaponTimers: {
            magic_bolt: 0,
            piercing_bolt: 0,
            bouncing_spark: 0,
        },
        orbitAngle: 0,
    };

    player = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        radius: PLAYER_RADIUS,
        speed: PLAYER_SPEED,
        color: PLAYER_COLOR,
        targetX: WORLD_WIDTH / 2,
        targetY: WORLD_HEIGHT / 2,
        moving: false,
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        invincibleUntil: 0,
        xp: 0,
        level: 1,
        damageMultiplier: 1,
        fireRateMultiplier: 1,
        weapons: ['magic_bolt'],
    };

    enemies = [];
    projectiles = [];
    xpGems = [];
    particles = [];
    levelUpCards = [];
    selectedPowerupIndex = -1;
    levelUpOpenTime = 0;
    enemyIdCounter = 0;
}

resetGameState();

// --------------- High Score ---------------
function getHighScore() {
    try {
        return parseFloat(localStorage.getItem('survivor_highscore')) || 0;
    } catch (e) {
        return 0;
    }
}

function setHighScore(time) {
    try {
        const current = getHighScore();
        if (time > current) {
            localStorage.setItem('survivor_highscore', time.toString());
            return true;
        }
    } catch (e) { /* noop */ }
    return false;
}

// --------------- Camera ---------------
function updateCamera() {
    game.camera.x = player.x - canvas.width / 2;
    game.camera.y = player.y - canvas.height / 2;
}

function worldToScreen(wx, wy) {
    let offsetX = 0;
    let offsetY = 0;
    if (game.shakeTimer > 0) {
        const intensity = game.shakeMagnitude * (game.shakeTimer / SHAKE_DURATION);
        offsetX = (Math.random() * 2 - 1) * intensity;
        offsetY = (Math.random() * 2 - 1) * intensity;
    }
    return {
        x: wx - game.camera.x + offsetX,
        y: wy - game.camera.y + offsetY,
    };
}

// --------------- Particles (#16, #17) ---------------
function spawnDamageNumber(x, y, damage) {
    particles.push({
        type: 'damage_number',
        x: x,
        y: y,
        vy: -60,
        text: String(Math.round(damage)),
        lifetime: DAMAGE_NUMBER_LIFETIME,
        maxLifetime: DAMAGE_NUMBER_LIFETIME,
        color: '#ffffff',
    });
}

function spawnDeathParticles(x, y, color) {
    const count = randInt(DEATH_PARTICLE_COUNT_MIN, DEATH_PARTICLE_COUNT_MAX);
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randRange(80, 200);
        particles.push({
            type: 'death_square',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: randRange(3, 6),
            lifetime: DEATH_PARTICLE_LIFETIME,
            maxLifetime: DEATH_PARTICLE_LIFETIME,
            color: color,
        });
    }
}

function spawnXpBurst(x, y) {
    for (let i = 0; i < XP_BURST_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = randRange(40, 100);
        particles.push({
            type: 'xp_burst',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: randRange(2, 4),
            lifetime: 0.3,
            maxLifetime: 0.3,
            color: '#ffdd44',
        });
    }
}

function triggerScreenShake() {
    game.shakeTimer = SHAKE_DURATION;
    game.shakeMagnitude = SHAKE_MAGNITUDE;
}

// --------------- Enemy Spawning ---------------
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const camX = game.camera.x;
    const camY = game.camera.y;

    switch (side) {
        case 0: x = camX + Math.random() * canvas.width; y = camY - ENEMY_SPAWN_MARGIN; break;
        case 1: x = camX + canvas.width + ENEMY_SPAWN_MARGIN; y = camY + Math.random() * canvas.height; break;
        case 2: x = camX + Math.random() * canvas.width; y = camY + canvas.height + ENEMY_SPAWN_MARGIN; break;
        case 3: x = camX - ENEMY_SPAWN_MARGIN; y = camY + Math.random() * canvas.height; break;
    }

    x = Math.max(ENEMY_RADIUS, Math.min(WORLD_WIDTH - ENEMY_RADIUS, x));
    y = Math.max(ENEMY_RADIUS, Math.min(WORLD_HEIGHT - ENEMY_RADIUS, y));

    const t = game.survivalTime;
    const hp = getScaledValue(ENEMY_BASE_HP, t, 60);
    const speed = getScaledValue(ENEMY_BASE_SPEED, t, 120);
    const xpDrop = getScaledValue(XP_BASE_VALUE, t, 120);

    enemyIdCounter++;
    enemies.push({
        id: enemyIdCounter,
        x: x,
        y: y,
        radius: ENEMY_RADIUS,
        speed: speed,
        color: ENEMY_COLOR,
        hp: hp,
        maxHp: hp,
        xpDrop: xpDrop,
        flashTimer: 0,
    });
}

// --------------- Weapons ---------------
function findNearestEnemy(fromX, fromY, excludeId) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of enemies) {
        if (excludeId !== undefined && enemy.id === excludeId) continue;
        const d = circleDistance({ x: fromX, y: fromY, radius: 0 }, enemy);
        if (d < nearestDist) {
            nearestDist = d;
            nearest = enemy;
        }
    }
    return nearest;
}

function fireMagicBolt() {
    if (enemies.length === 0) return;
    Sound.playAttack();
    const target = findNearestEnemy(player.x, player.y);
    if (!target) return;
    const dir = normalize(target.x - player.x, target.y - player.y);
    projectiles.push({
        type: 'magic_bolt',
        x: player.x,
        y: player.y,
        vx: dir.x * MAGIC_BOLT_SPEED,
        vy: dir.y * MAGIC_BOLT_SPEED,
        radius: MAGIC_BOLT_RADIUS,
        damage: MAGIC_BOLT_DAMAGE * player.damageMultiplier,
        maxRange: MAGIC_BOLT_RANGE,
        distanceTraveled: 0,
        pierceCount: 0,
        bouncesRemaining: 0,
        color: '#ffffff',
        hitEnemies: new Set(),
    });
}

function firePiercingBolt() {
    // Fires two bolts: left and right (#7)
    const dirs = [{ x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const dir of dirs) {
        projectiles.push({
            type: 'piercing_bolt',
            x: player.x,
            y: player.y,
            vx: dir.x * PIERCING_BOLT_SPEED,
            vy: dir.y * PIERCING_BOLT_SPEED,
            radius: PIERCING_BOLT_RADIUS,
            damage: PIERCING_BOLT_DAMAGE * player.damageMultiplier,
            maxRange: PIERCING_BOLT_RANGE,
            distanceTraveled: 0,
            pierceCount: PIERCING_BOLT_MAX_PIERCE,
            bouncesRemaining: 0,
            color: '#ff8844',
            hitEnemies: new Set(),
        });
    }
}

function fireBouncingSpark() {
    if (enemies.length === 0) return;
    Sound.playAttack();
    const target = findNearestEnemy(player.x, player.y);
    if (!target) return;
    const dir = normalize(target.x - player.x, target.y - player.y);
    projectiles.push({
        type: 'bouncing_spark',
        x: player.x,
        y: player.y,
        vx: dir.x * SPARK_SPEED,
        vy: dir.y * SPARK_SPEED,
        radius: SPARK_RADIUS,
        damage: SPARK_DAMAGE * player.damageMultiplier,
        maxRange: SPARK_RANGE,
        distanceTraveled: 0,
        pierceCount: 0,
        bouncesRemaining: SPARK_MAX_BOUNCES,
        color: SPARK_COLOR,
        hitEnemies: new Set(),
        lastHitId: -1,
    });
}

// --------------- XP & Leveling (#9) ---------------
function getXpThreshold(level) {
    if (level - 1 < XP_THRESHOLDS.length) {
        return XP_THRESHOLDS[level - 1];
    }
    return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + (level - XP_THRESHOLDS.length) * 300;
}

function spawnXpGem(x, y, value) {
    xpGems.push({
        x: x,
        y: y,
        radius: XP_GEM_RADIUS,
        color: XP_GEM_COLOR,
        value: value,
    });
}

// --------------- Level Up Cards (#10) ---------------
function generateLevelUpCards() {
    levelUpCards = [];
    selectedPowerupIndex = -1;
    levelUpOpenTime = performance.now();

    if (isPortrait) {
        // Portrait/mobile: stack cards vertically with smaller dimensions
        const cardW = Math.min(CARD_WIDTH, canvas.width * 0.7);
        const cardH = Math.min(160, (canvas.height - 160) / CARD_COUNT - 12);
        const gap = 12;
        const totalHeight = CARD_COUNT * cardH + (CARD_COUNT - 1) * gap;
        const startX = (canvas.width - cardW) / 2;
        const startY = (canvas.height - totalHeight) / 2 + 30;

        for (let i = 0; i < CARD_COUNT; i++) {
            const powerup = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
            levelUpCards.push({
                x: startX,
                y: startY + i * (cardH + gap),
                width: cardW,
                height: cardH,
                powerup: powerup,
                hovered: false,
            });
        }
    } else {
        // Landscape/desktop: horizontal row
        const totalWidth = CARD_COUNT * CARD_WIDTH + (CARD_COUNT - 1) * CARD_GAP;
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - CARD_HEIGHT) / 2;

        for (let i = 0; i < CARD_COUNT; i++) {
            const powerup = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
            levelUpCards.push({
                x: startX + i * (CARD_WIDTH + CARD_GAP),
                y: startY,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                powerup: powerup,
                hovered: false,
            });
        }
    }
}

function generateLevelUpCardsFromPowerups(powerups) {
    levelUpCards = [];
    selectedPowerupIndex = -1;
    levelUpOpenTime = performance.now();

    if (isPortrait) {
        const cardW = Math.min(CARD_WIDTH, canvas.width * 0.7);
        const cardH = Math.min(160, (canvas.height - 160) / CARD_COUNT - 12);
        const gap = 12;
        const totalHeight = CARD_COUNT * cardH + (CARD_COUNT - 1) * gap;
        const startX = (canvas.width - cardW) / 2;
        const startY = (canvas.height - totalHeight) / 2 + 30;

        for (let i = 0; i < powerups.length; i++) {
            levelUpCards.push({
                x: startX,
                y: startY + i * (cardH + gap),
                width: cardW,
                height: cardH,
                powerup: powerups[i],
                hovered: false,
            });
        }
    } else {
        const totalWidth = CARD_COUNT * CARD_WIDTH + (CARD_COUNT - 1) * CARD_GAP;
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - CARD_HEIGHT) / 2;

        for (let i = 0; i < powerups.length; i++) {
            levelUpCards.push({
                x: startX + i * (CARD_WIDTH + CARD_GAP),
                y: startY,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                powerup: powerups[i],
                hovered: false,
            });
        }
    }
}

function handleLevelUpClick(clickX, clickY) {
    // Guard against stray clicks when level-up just opened (200ms)
    if (performance.now() - levelUpOpenTime < 200) return false;

    // Check if confirm button was clicked
    if (selectedPowerupIndex >= 0) {
        const small = canvas.width < 600;
        const btnW = small ? 140 : 180;
        const btnH = small ? 36 : 44;
        const lastCard = levelUpCards[levelUpCards.length - 1];
        const btnX = canvas.width / 2 - btnW / 2;
        const btnY = lastCard.y + lastCard.height + (small ? 16 : 24);
        if (clickX >= btnX && clickX <= btnX + btnW &&
            clickY >= btnY && clickY <= btnY + btnH) {
            levelUpCards[selectedPowerupIndex].powerup.apply();
            game.state = 'PLAYING';
            levelUpCards = [];
            selectedPowerupIndex = -1;
            return true;
        }
    }

    // Check if a card was clicked (select it)
    for (let i = 0; i < levelUpCards.length; i++) {
        const card = levelUpCards[i];
        if (clickX >= card.x && clickX <= card.x + card.width &&
            clickY >= card.y && clickY <= card.y + card.height) {
            selectedPowerupIndex = i;
            return true;
        }
    }
    return false;
}

// --------------- Input ---------------
let isDragging = false;

function handleGameClick(screenX, screenY) {
    if (game.state === 'MENU') {
        Sound.init();
        game.state = 'PLAYING';
        game.lastTime = performance.now();
        updateCamera();
        return;
    }

    if (game.state === 'GAME_OVER') {
        Sound.init();
        setHighScore(game.survivalTime);
        resetGameState();
        game.state = 'PLAYING';
        game.lastTime = performance.now();
        updateCamera();
        return;
    }

    if (game.state === 'PAUSED_LEVELUP') {
        handleLevelUpClick(screenX, screenY);
        return;
    }

    if (game.state === 'PLAYING') {
        const worldClickX = screenX + game.camera.x;
        const worldClickY = screenY + game.camera.y;
        player.targetX = worldClickX;
        player.targetY = worldClickY;
        player.moving = true;
    }
}

// --- Mouse events ---
canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (game.state === 'MENU' || game.state === 'GAME_OVER' || game.state === 'PAUSED_LEVELUP') {
        handleGameClick(sx, sy);
        return;
    }

    if (game.state === 'PLAYING') {
        isDragging = true;
        const worldX = sx + game.camera.x;
        const worldY = sy + game.camera.y;
        player.targetX = worldX;
        player.targetY = worldY;
        player.moving = true;
    }
});

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Hover detection for level-up cards
    if (game.state === 'PAUSED_LEVELUP') {
        for (const card of levelUpCards) {
            card.hovered = mx >= card.x && mx <= card.x + card.width &&
                           my >= card.y && my <= card.y + card.height;
        }
    }

    // Drag-to-move: update target while dragging
    if (isDragging && game.state === 'PLAYING') {
        const worldX = mx + game.camera.x;
        const worldY = my + game.camera.y;
        player.targetX = worldX;
        player.targetY = worldY;
        player.moving = true;
    }
});

canvas.addEventListener('mouseup', function() {
    isDragging = false;
});

// --- Touch events (#18, #24) ---
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;

    if (game.state === 'MENU' || game.state === 'GAME_OVER' || game.state === 'PAUSED_LEVELUP') {
        handleGameClick(sx, sy);
        return;
    }

    if (game.state === 'PLAYING') {
        isDragging = true;
        const worldX = sx + game.camera.x;
        const worldY = sy + game.camera.y;
        player.targetX = worldX;
        player.targetY = worldY;
        player.moving = true;
    }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (isDragging && game.state === 'PLAYING') {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const worldX = (touch.clientX - rect.left) + game.camera.x;
        const worldY = (touch.clientY - rect.top) + game.camera.y;
        player.targetX = worldX;
        player.targetY = worldY;
        player.moving = true;
    }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    e.preventDefault();
    isDragging = false;
}, { passive: false });

// --------------- Update ---------------
// --------------- Enemy Soft Collision (#29) ---------------
function applyEnemySeparation() {
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const a = enemies[i];
            const b = enemies[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minRadius = Math.min(a.radius, b.radius);
            const combinedRadius = a.radius + b.radius;
            const overlapStart = combinedRadius * (1 - ENEMY_OVERLAP_THRESHOLD);
            if (dist < overlapStart && dist > 0.01) {
                const overlap = overlapStart - dist;
                const pushDist = overlap * ENEMY_SEPARATION_FORCE;
                const nx = dx / dist;
                const ny = dy / dist;
                a.x -= nx * pushDist * 0.5;
                a.y -= ny * pushDist * 0.5;
                b.x += nx * pushDist * 0.5;
                b.y += ny * pushDist * 0.5;
            }
        }
    }
}

function update(dt) {
    if (game.state !== 'PLAYING') return;

    game.survivalTime += dt;
    const now = game.survivalTime;

    // Screen shake timer
    if (game.shakeTimer > 0) {
        game.shakeTimer -= dt;
        if (game.shakeTimer < 0) game.shakeTimer = 0;
    }

    // Player movement (#2)
    if (player.moving) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 2) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
        } else {
            const step = player.speed * dt;
            if (step >= d) {
                player.x = player.targetX;
                player.y = player.targetY;
                player.moving = false;
            } else {
                player.x += (dx / d) * step;
                player.y += (dy / d) * step;
            }
        }

        player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));
    }

    // Enemy spawning (#3) with scaling (#12)
    game.enemySpawnTimer += dt;
    const spawnInterval = getSpawnInterval(now);
    if (game.enemySpawnTimer >= spawnInterval) {
        game.enemySpawnTimer -= spawnInterval;
        spawnEnemy();
    }

    // Build spatial grid for enemies (#8)
    const enemyGrid = buildSpatialGrid(enemies);

    // Enemy AI: chase player (#3)
    for (const enemy of enemies) {
        const dir = normalize(player.x - enemy.x, player.y - enemy.y);
        enemy.x += dir.x * enemy.speed * dt;
        enemy.y += dir.y * enemy.speed * dt;

        // Flash timer (#17)
        if (enemy.flashTimer > 0) {
            enemy.flashTimer -= dt;
        }
    }

    // Enemy soft collision / repulsion (#29)
    applyEnemySeparation();

    // Contact damage (#4) with scaling (#12)
    const contactDamage = getScaledValue(CONTACT_BASE_DPS, now, 90);
    const nearbyToPlayer = queryNearby(enemyGrid, player.x, player.y, player.radius + ENEMY_RADIUS);
    for (const idx of nearbyToPlayer) {
        const enemy = enemies[idx];
        if (circlesOverlap(player, enemy)) {
            if (now >= player.invincibleUntil) {
                player.hp -= contactDamage;
                Sound.playDamage();
                triggerScreenShake();
                if (player.hp <= 0) {
                    player.hp = 0;
                    setHighScore(game.survivalTime);
                    game.state = 'GAME_OVER';
                    return;
                }
                player.invincibleUntil = now + IFRAME_DURATION;
            }
        }
    }

    // Weapon firing (#5)
    // Magic Bolt
    game.weaponTimers.magic_bolt -= dt;
    if (game.weaponTimers.magic_bolt <= 0) {
        fireMagicBolt();
        game.weaponTimers.magic_bolt = MAGIC_BOLT_COOLDOWN / player.fireRateMultiplier;
    }

    // Piercing Bolt (#7)
    if (player.weapons.includes('piercing_bolt')) {
        game.weaponTimers.piercing_bolt -= dt;
        if (game.weaponTimers.piercing_bolt <= 0) {
            firePiercingBolt();
            game.weaponTimers.piercing_bolt = PIERCING_BOLT_COOLDOWN / player.fireRateMultiplier;
        }
    }

    // Bouncing Spark (#13)
    if (player.weapons.includes('bouncing_spark')) {
        game.weaponTimers.bouncing_spark -= dt;
        if (game.weaponTimers.bouncing_spark <= 0) {
            fireBouncingSpark();
            game.weaponTimers.bouncing_spark = SPARK_COOLDOWN / player.fireRateMultiplier;
        }
    }

    // Orbit Shield (#11)
    if (player.weapons.includes('orbit_shield')) {
        game.orbitAngle += (2 * Math.PI / ORBIT_PERIOD) * dt;
        for (let i = 0; i < ORBIT_ORB_COUNT; i++) {
            const angle = game.orbitAngle + (i * Math.PI * 2 / ORBIT_ORB_COUNT);
            const orbX = player.x + Math.cos(angle) * ORBIT_RADIUS;
            const orbY = player.y + Math.sin(angle) * ORBIT_RADIUS;
            const orb = { x: orbX, y: orbY, radius: ORBIT_ORB_RADIUS };

            const nearbyOrb = queryNearby(enemyGrid, orbX, orbY, ORBIT_ORB_RADIUS + ENEMY_RADIUS);
            for (const idx of nearbyOrb) {
                const enemy = enemies[idx];
                if (!enemy) continue;
                if (circlesOverlap(orb, enemy)) {
                    const cooldownKey = 'orb_' + i + '_' + enemy.id;
                    if (!enemy[cooldownKey] || now - enemy[cooldownKey] >= ORBIT_HIT_COOLDOWN) {
                        enemy[cooldownKey] = now;
                        enemy.hp -= ORBIT_DAMAGE * player.damageMultiplier;
                        enemy.flashTimer = 0.05;
                        spawnDamageNumber(enemy.x, enemy.y - enemy.radius, ORBIT_DAMAGE * player.damageMultiplier);
                    }
                }
            }
        }
    }

    // Update projectiles (#5)
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const moveX = p.vx * dt;
        const moveY = p.vy * dt;
        p.x += moveX;
        p.y += moveY;
        p.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

        if (p.distanceTraveled >= p.maxRange) {
            projectiles.splice(i, 1);
            continue;
        }

        // Check collisions with enemies using spatial grid
        let projectileRemoved = false;
        const nearbyProj = queryNearby(enemyGrid, p.x, p.y, p.radius + ENEMY_RADIUS);
        for (const idx of nearbyProj) {
            const enemy = enemies[idx];
            if (!enemy) continue;
            if (p.hitEnemies.has(enemy.id)) continue;
            if (circlesOverlap(p, enemy)) {
                enemy.hp -= p.damage;
                enemy.flashTimer = 0.05;
                spawnDamageNumber(enemy.x, enemy.y - enemy.radius, p.damage);
                p.hitEnemies.add(enemy.id);

                if (enemy.hp <= 0) {
                    Sound.playEnemyDeath();
                    spawnXpGem(enemy.x, enemy.y, enemy.xpDrop);
                    spawnDeathParticles(enemy.x, enemy.y, enemy.color);
                    const enemyIdx = enemies.indexOf(enemy);
                    if (enemyIdx !== -1) enemies.splice(enemyIdx, 1);
                    game.killCount++;
                }

                // Handle piercing
                if (p.pierceCount > 0) {
                    p.pierceCount--;
                    continue;
                }

                // Handle bouncing (#13)
                if (p.bouncesRemaining > 0) {
                    p.bouncesRemaining--;
                    p.distanceTraveled = 0;
                    const nextTarget = findNearestEnemy(p.x, p.y, enemy.id);
                    if (nextTarget) {
                        const dir = normalize(nextTarget.x - p.x, nextTarget.y - p.y);
                        p.vx = dir.x * SPARK_SPEED;
                        p.vy = dir.y * SPARK_SPEED;
                        continue;
                    }
                }

                projectiles.splice(i, 1);
                projectileRemoved = true;
                break;
            }
        }
        if (projectileRemoved) continue;
    }

    // Clean up dead enemies from orbit damage
    for (let j = enemies.length - 1; j >= 0; j--) {
        if (enemies[j].hp <= 0) {
            spawnXpGem(enemies[j].x, enemies[j].y, enemies[j].xpDrop);
            spawnDeathParticles(enemies[j].x, enemies[j].y, enemies[j].color);
            enemies.splice(j, 1);
            game.killCount++;
        }
    }

    // Update XP gems (#6)
    for (let i = xpGems.length - 1; i >= 0; i--) {
        const gem = xpGems[i];
        const d = circleDistance(player, gem);

        if (d < XP_GEM_MAGNET_RANGE) {
            const dir = normalize(player.x - gem.x, player.y - gem.y);
            gem.x += dir.x * XP_GEM_MAGNET_SPEED * dt;
            gem.y += dir.y * XP_GEM_MAGNET_SPEED * dt;
        }

        if (circlesOverlap(player, gem)) {
            player.xp += gem.value;
            spawnXpBurst(gem.x, gem.y);

            const threshold = getXpThreshold(player.level);
            if (player.xp >= threshold) {
                player.xp -= threshold;
                player.level++;
                Sound.playLevelUp();
                game.state = 'PAUSED_LEVELUP';
                generateLevelUpCards();
            }

            Sound.playXpPickup();
            xpGems.splice(i, 1);
        }
    }

    // Update particles (#16)
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.lifetime -= dt;
        if (p.lifetime <= 0) {
            particles.splice(i, 1);
            continue;
        }
        if (p.vx !== undefined) p.x += p.vx * dt;
        if (p.vy !== undefined) p.y += p.vy * dt;
    }

    updateCamera();
}

// --------------- Render ---------------
function render() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (game.state === 'MENU') {
        renderMenuScreen();
        return;
    }

    // Draw grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const startX = Math.floor(game.camera.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(game.camera.y / GRID_SIZE) * GRID_SIZE;
    const endX = game.camera.x + canvas.width;
    const endY = game.camera.y + canvas.height;

    for (let x = startX; x <= endX; x += GRID_SIZE) {
        const sx = x - game.camera.x;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
        const sy = y - game.camera.y;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(canvas.width, sy);
        ctx.stroke();
    }

    // Draw XP gems
    for (const gem of xpGems) {
        const sp = worldToScreen(gem.x, gem.y);
        ctx.fillStyle = gem.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, gem.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw enemies
    for (const enemy of enemies) {
        const sp = worldToScreen(enemy.x, enemy.y);
        if (enemy.flashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = enemy.color;
        }
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw projectiles
    for (const p of projectiles) {
        const sp = worldToScreen(p.x, p.y);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw orbit shield orbs (#11)
    if (player.weapons.includes('orbit_shield')) {
        for (let i = 0; i < ORBIT_ORB_COUNT; i++) {
            const angle = game.orbitAngle + (i * Math.PI * 2 / ORBIT_ORB_COUNT);
            const orbX = player.x + Math.cos(angle) * ORBIT_RADIUS;
            const orbY = player.y + Math.sin(angle) * ORBIT_RADIUS;
            const sp = worldToScreen(orbX, orbY);
            ctx.fillStyle = ORBIT_COLOR;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, ORBIT_ORB_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw player with pulse (#17)
    const sp = worldToScreen(player.x, player.y);
    const isInvincible = game.survivalTime < player.invincibleUntil;
    const pulseScale = 1.0 + 0.1 * Math.sin(game.survivalTime * 2 * Math.PI);
    const drawRadius = player.radius * pulseScale;

    if (isInvincible && Math.floor(game.survivalTime * 10) % 2 === 0) {
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = player.color;
    }
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, drawRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw particles (#16)
    for (const p of particles) {
        const alpha = p.lifetime / p.maxLifetime;
        if (p.type === 'damage_number') {
            const psp = worldToScreen(p.x, p.y);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.text, psp.x, psp.y);
            ctx.globalAlpha = 1;
        } else if (p.type === 'death_square' || p.type === 'xp_burst') {
            const psp = worldToScreen(p.x, p.y);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fillRect(psp.x - p.size / 2, psp.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
    }

    // HUD (#14)
    renderHUD();

    // Overlays
    if (game.state === 'GAME_OVER') {
        renderGameOverScreen();
    }

    if (game.state === 'PAUSED_LEVELUP') {
        renderLevelUpScreen();
    }
}

// --------------- Menu Screen (#15) ---------------
function renderMenuScreen() {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const small = canvas.width < 600;
    const titleSize = small ? 48 : 80;
    const subSize = small ? 18 : 24;
    const hintSize = small ? 13 : 16;
    const hsSize = small ? 14 : 18;

    ctx.fillStyle = '#4488ff';
    ctx.font = 'bold ' + titleSize + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SURVIVOR', canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = '#888888';
    ctx.font = subSize + 'px sans-serif';
    ctx.fillText(small ? 'Tap to Play' : 'Click to Play', canvas.width / 2, canvas.height / 2 + 10);

    const hs = getHighScore();
    if (hs > 0) {
        ctx.fillStyle = '#ffdd44';
        ctx.font = hsSize + 'px sans-serif';
        ctx.fillText('Best Time: ' + formatTime(hs), canvas.width / 2, canvas.height / 2 + 60);
    }

    ctx.fillStyle = '#555555';
    ctx.font = hintSize + 'px sans-serif';
    ctx.fillText(small ? 'Tap to move \u2022 Auto-fire \u2022 Survive!' : 'Click to move \u2022 Auto-fire weapons \u2022 Survive!', canvas.width / 2, canvas.height / 2 + 120);
}

// --------------- Game Over Screen (#15) ---------------
function renderGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const small = canvas.width < 600;
    const titleSize = small ? 40 : 64;
    const statsSize = small ? 16 : 24;
    const recordSize = small ? 16 : 20;
    const hintSize = small ? 14 : 18;

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold ' + titleSize + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = statsSize + 'px sans-serif';
    if (small) {
        ctx.fillText('Survived: ' + formatTime(game.survivalTime), canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Kills: ' + game.killCount + '  |  Level: ' + player.level, canvas.width / 2, canvas.height / 2 + 14);
    } else {
        ctx.fillText(
            'Survived: ' + formatTime(game.survivalTime) + '  |  Kills: ' + game.killCount + '  |  Level: ' + player.level,
            canvas.width / 2, canvas.height / 2
        );
    }

    const hs = getHighScore();
    const isNewRecord = game.survivalTime >= hs;
    if (isNewRecord) {
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold ' + recordSize + 'px sans-serif';
        ctx.fillText('NEW RECORD!', canvas.width / 2, canvas.height / 2 + 40);
    } else if (hs > 0) {
        ctx.fillStyle = '#888888';
        ctx.font = hintSize + 'px sans-serif';
        ctx.fillText('Best Time: ' + formatTime(hs), canvas.width / 2, canvas.height / 2 + 40);
    }

    ctx.fillStyle = '#888888';
    ctx.font = hintSize + 'px sans-serif';
    ctx.fillText(small ? 'Tap to Play Again' : 'Click to Play Again', canvas.width / 2, canvas.height / 2 + 80);
}

// --------------- Level Up Screen (#10) ---------------
function renderLevelUpScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const small = canvas.width < 600;
    const cardsY = levelUpCards.length > 0 ? levelUpCards[0].y : canvas.height / 2;

    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold ' + (small ? 32 : 48) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', canvas.width / 2, cardsY - (small ? 24 : 40));

    ctx.fillStyle = '#ffffff';
    ctx.font = (small ? 14 : 20) + 'px sans-serif';
    ctx.fillText('Level ' + player.level + ' \u2014 Choose a powerup:', canvas.width / 2, cardsY - (small ? 6 : 10));

    for (let i = 0; i < levelUpCards.length; i++) {
        const card = levelUpCards[i];
        const isSelected = (i === selectedPowerupIndex);

        ctx.fillStyle = isSelected ? '#2a2a44' : (card.hovered ? '#333333' : '#222222');
        ctx.fillRect(card.x, card.y, card.width, card.height);

        if (isSelected) {
            ctx.shadowColor = card.powerup.color;
            ctx.shadowBlur = 16;
        }
        ctx.strokeStyle = isSelected ? card.powerup.color : (card.hovered ? card.powerup.color : '#555555');
        ctx.lineWidth = isSelected ? 3 : (card.hovered ? 3 : 1);
        ctx.strokeRect(card.x, card.y, card.width, card.height);
        ctx.shadowBlur = 0;

        const iconRadius = small ? 16 : 25;
        const iconY = small ? card.y + card.height * 0.3 : card.y + 60;
        ctx.fillStyle = card.powerup.color;
        ctx.beginPath();
        ctx.arc(card.x + card.width / 2, iconY, iconRadius, 0, Math.PI * 2);
        ctx.fill();

        const nameSize = small ? 14 : 18;
        const descSize = small ? 11 : 14;
        const nameY = small ? iconY + iconRadius + 16 : card.y + 120;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + nameSize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(card.powerup.name, card.x + card.width / 2, nameY);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = descSize + 'px sans-serif';
        const words = card.powerup.description.split(' ');
        let line = '';
        let lineY = nameY + (small ? 16 : 30);
        for (const word of words) {
            const testLine = line + (line ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > card.width - 20) {
                ctx.fillText(line, card.x + card.width / 2, lineY);
                line = word;
                lineY += small ? 14 : 18;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, card.x + card.width / 2, lineY);
        }
    }

    // Confirm button (only shown when a card is selected)
    if (selectedPowerupIndex >= 0) {
        const btnW = small ? 140 : 180;
        const btnH = small ? 36 : 44;
        const lastCard = levelUpCards[levelUpCards.length - 1];
        const btnX = canvas.width / 2 - btnW / 2;
        const btnY = lastCard.y + lastCard.height + (small ? 16 : 24);

        // Button background
        const selectedColor = levelUpCards[selectedPowerupIndex].powerup.color;
        ctx.fillStyle = selectedColor;
        ctx.shadowColor = selectedColor;
        ctx.shadowBlur = 12;
        // Rounded rectangle for confirm button
        const r = 8;
        ctx.beginPath();
        ctx.moveTo(btnX + r, btnY);
        ctx.lineTo(btnX + btnW - r, btnY);
        ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + r, r);
        ctx.lineTo(btnX + btnW, btnY + btnH - r);
        ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH, r);
        ctx.lineTo(btnX + r, btnY + btnH);
        ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - r, r);
        ctx.lineTo(btnX, btnY + r);
        ctx.arcTo(btnX, btnY, btnX + r, btnY, r);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Button text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold ' + (small ? 16 : 20) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CONFIRM', canvas.width / 2, btnY + btnH / 2 + (small ? 5 : 7));
    } else {
        // Hint text when no card is selected
        const lastCard = levelUpCards[levelUpCards.length - 1];
        if (lastCard) {
            const hintY = lastCard.y + lastCard.height + (small ? 24 : 36);
            ctx.fillStyle = '#666666';
            ctx.font = (small ? 12 : 14) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Click a powerup to select, then confirm', canvas.width / 2, hintY);
        }
    }
}

// --------------- HUD (#14) ---------------
function renderHUD() {
    ctx.save();

    const small = canvas.width < 600;

    // Health bar (top-left)
    const hbX = small ? 10 : 20;
    const hbY = small ? 10 : 20;
    const hbWidth = small ? 120 : 200;
    const hbHeight = small ? 14 : 20;
    const hpRatio = player.hp / player.maxHp;

    ctx.fillStyle = '#661111';
    ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
    ctx.fillStyle = hpRatio > 0.3 ? '#44cc44' : '#cc4444';
    ctx.fillRect(hbX, hbY, hbWidth * hpRatio, hbHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = (small ? 10 : 12) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(player.hp) + ' / ' + player.maxHp, hbX + hbWidth / 2, hbY + (small ? 11 : 15));

    // Timer (top-center)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + (small ? 18 : 24) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(game.survivalTime), canvas.width / 2, small ? 26 : 38);

    // Kill count (top-right)
    ctx.fillStyle = '#ff8888';
    ctx.font = (small ? 12 : 16) + 'px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Kills: ' + game.killCount, canvas.width - (small ? 10 : 20), small ? 24 : 35);

    // XP bar (bottom-center)
    const xpBarWidth = small ? Math.min(200, canvas.width - 40) : 300;
    const xpBarHeight = small ? 12 : 16;
    const xpBarX = (canvas.width - xpBarWidth) / 2;
    const xpBarY = canvas.height - (small ? 30 : 40);
    const xpThreshold = getXpThreshold(player.level);
    const xpRatio = Math.min(player.xp / xpThreshold, 1);

    ctx.fillStyle = '#333333';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth * xpRatio, xpBarHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = (small ? 11 : 14) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level ' + player.level, canvas.width / 2, xpBarY - (small ? 4 : 6));

    ctx.restore();
}

// --------------- Game Loop ---------------
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - game.lastTime) / 1000, 0.1);
    game.lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(gameLoop);
}

// --------------- Init ---------------
function init() {
    game.lastTime = performance.now();
    updateCamera();
    requestAnimationFrame(gameLoop);
}

init();
