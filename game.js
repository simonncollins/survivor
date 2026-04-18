// ============================================================
// Survivor — HTML5 Canvas Survival Game
// ============================================================

// --------------- Constants ---------------
// WORLD_WIDTH/WORLD_HEIGHT removed — world is infinite (issue #30)
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

// --------------- New Powerup Constants (#26) ---------------
const XP_MAGNET_BASE = 120;
const XP_MAGNET_STEP = 40;
const EXPLOSION_BASE_RADIUS = 60;
const EXPLOSION_STEP_RADIUS = 20;
const EXPLOSION_DAMAGE_FRAC = 0.5;
const EXPLOSION_VISUAL_LIFETIME = 0.25;
const EXPLOSION_COLOR = '#ffaa33';
const AURA_BASE_RADIUS = 100;
const AURA_STEP_RADIUS = 20;
const AURA_BASE_DAMAGE = 15;
const AURA_STEP_DAMAGE = 8;
const AURA_INTERVAL = 1.5;
const AURA_COLOR = '#88ffcc';
const BEAM_RANGE = 350;
const BEAM_DPS_BASE = 30;
const BEAM_DPS_STEP = 15;
const BEAM_WIDTH = 3;
const BEAM_COLOR = '#ff44aa';
const ARMOR_STEP = 0.10;
const ARMOR_CAP = 0.60;
const REGEN_STEP = 0.33;

const XP_BURST_COUNT = 3;

// Screen shake (#17)
const SHAKE_MAGNITUDE = 8;
const SHAKE_DURATION = 0.3;

// Enemy Soft Collision (#29)
const ENEMY_SEPARATION_FORCE = 0.4;
const ENEMY_OVERLAP_THRESHOLD = 0.5; // fraction of smaller radius before repulsion

// Treasure Chests (#27)
const CHEST_WIDTH = 32;
const CHEST_HEIGHT = 26;
const CHEST_MIN_INTERVAL = 45;
const CHEST_MAX_INTERVAL = 90;
const CHEST_SPAWN_DIST_MIN = 400;
const CHEST_SPAWN_DIST_MAX = 600;
const CHEST_MAX_COUNT = 5;
const CHEST_REWARD_MIN = 1;
const CHEST_REWARD_MAX = 5;

// Chest Rarity Tiers (#46)
const CHEST_RARITY_COMMON = 'common';
const CHEST_RARITY_UNCOMMON = 'uncommon';
const CHEST_RARITY_RARE = 'rare';
const CHEST_RARITY_WEIGHTS = [
    { rarity: CHEST_RARITY_COMMON, weight: 0.70, rewardCount: 1 },
    { rarity: CHEST_RARITY_UNCOMMON, weight: 0.25, rewardCount: 3 },
    { rarity: CHEST_RARITY_RARE, weight: 0.05, rewardCount: 5 },
];

// Reward Dialog layout (#54)
const REWARD_DIALOG_PADDING = 20;
const REWARD_DIALOG_ITEM_HEIGHT = 60;
const REWARD_DIALOG_ITEM_GAP = 10;
const REWARD_DIALOG_MAX_WIDTH = 500;
const REWARD_DIALOG_CELEBRATION_DURATION = 3.0;

// Build version for splash screen and cache-busting (#62)
const BUILD_VERSION = 'v2026-04-18 · r001';

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
    if (game && game.state === 'PAUSED_CHEST' && rewardDialog) {
        layoutRewardDialog();
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

// --------------- Powerup Registry (#10, #43) ---------------
const POWERUPS = [
    {
        id: 'moveSpeed',
        name: 'Move Speed Up',
        description: '+10% player speed',
        color: '#44ffff',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            return '+' + (lvl * 10) + '% speed → +' + ((lvl + 1) * 10) + '% speed';
        },
        apply: function() {
            this.level++;
            player.speed *= 1.10;
        },
    },
    {
        id: 'maxHp',
        name: 'Max HP Up',
        description: '+25 max HP, heal 25',
        color: '#44ff44',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            return '+' + (lvl * 25) + ' max HP → +' + ((lvl + 1) * 25) + ' max HP';
        },
        apply: function() {
            this.level++;
            player.maxHp += 25;
            player.hp = Math.min(player.hp + 25, player.maxHp);
        },
    },
    {
        id: 'piercing',
        name: 'Piercing Bolt',
        description: 'Unlock: fires 2 piercing bolts left/right',
        color: '#ff8844',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const bolts = 2 + Math.max(0, lvl - 1);
            const nextBolts = 2 + lvl;
            return 'Fires ' + bolts + ' bolts → ' + nextBolts + ' bolts';
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('piercing_bolt')) {
                player.weapons.push('piercing_bolt');
            }
            player.piercingBoltLevel++;
        },
    },
    {
        id: 'orbit',
        name: 'Orbit Shield',
        description: 'Unlock: 4 orbiting damage orbs',
        color: ORBIT_COLOR,
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const orbs = 4 + Math.max(0, lvl - 1);
            const nextOrbs = 4 + lvl;
            return orbs + ' orbs → ' + nextOrbs + ' orbs';
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('orbit_shield')) {
                player.weapons.push('orbit_shield');
            }
            player.orbitShieldLevel++;
        },
    },
    {
        id: 'spark',
        name: 'Bouncing Spark',
        description: 'Unlock: bouncing projectile (3 bounces)',
        color: SPARK_COLOR,
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const bounces = 3 + Math.max(0, lvl - 1);
            const nextBounces = 3 + lvl;
            return bounces + ' bounces → ' + nextBounces + ' bounces';
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('bouncing_spark')) {
                player.weapons.push('bouncing_spark');
            }
            player.sparkLevel++;
        },
    },
    {
        id: 'xpRange',
        name: 'Greater XP Range',
        description: '+40 XP gem pickup range',
        color: '#ffee66',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const range = XP_MAGNET_BASE + (lvl * XP_MAGNET_STEP);
            const nextRange = XP_MAGNET_BASE + ((lvl + 1) * XP_MAGNET_STEP);
            return 'Range ' + range + ' → ' + nextRange;
        },
        apply: function() {
            this.level++;
            player.magnetRadius += XP_MAGNET_STEP;
        },
    },
    {
        id: 'explosion',
        name: 'Area Effect Explosions',
        description: 'Unlock: projectiles explode on impact',
        color: EXPLOSION_COLOR,
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const radius = EXPLOSION_BASE_RADIUS + ((lvl - 1) * EXPLOSION_STEP_RADIUS);
            const nextRadius = radius + EXPLOSION_STEP_RADIUS;
            return 'Radius ' + radius + ' → ' + nextRadius;
        },
        apply: function() {
            this.level++;
            if (player.explosionRadius <= 0) {
                player.explosionRadius = EXPLOSION_BASE_RADIUS;
            } else {
                player.explosionRadius += EXPLOSION_STEP_RADIUS;
            }
        },
    },
    {
        id: 'aura',
        name: 'Pulsing Aura',
        description: 'Unlock: damages nearby enemies every 1.5s',
        color: AURA_COLOR,
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const radius = AURA_BASE_RADIUS + ((lvl - 1) * AURA_STEP_RADIUS);
            const nextRadius = radius + AURA_STEP_RADIUS;
            const dmg = AURA_BASE_DAMAGE + ((lvl - 1) * AURA_STEP_DAMAGE);
            const nextDmg = dmg + AURA_STEP_DAMAGE;
            return 'R:' + radius + ' D:' + dmg + ' → R:' + nextRadius + ' D:' + nextDmg;
        },
        apply: function() {
            this.level++;
            player.auraLevel += 1;
        },
    },
    {
        id: 'beam',
        name: 'Beam',
        description: 'Unlock: continuous laser to nearest enemy',
        color: BEAM_COLOR,
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const dps = BEAM_DPS_BASE + ((lvl - 1) * BEAM_DPS_STEP);
            const nextDps = dps + BEAM_DPS_STEP;
            return dps + ' DPS → ' + nextDps + ' DPS';
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('beam')) {
                player.weapons.push('beam');
            }
            player.beamLevel += 1;
        },
    },
    {
        id: 'armor',
        name: 'Armor',
        description: '+10% damage reduction (cap 60%)',
        color: '#8899aa',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const pct = Math.min(ARMOR_CAP, lvl * ARMOR_STEP);
            const nextPct = Math.min(ARMOR_CAP, (lvl + 1) * ARMOR_STEP);
            return Math.round(pct * 100) + '% reduction → ' + Math.round(nextPct * 100) + '% reduction';
        },
        apply: function() {
            this.level++;
            player.armor = Math.min(ARMOR_CAP, player.armor + ARMOR_STEP);
        },
    },
    {
        id: 'regen',
        name: 'HP Regeneration',
        description: '+0.33 HP/sec regen',
        color: '#66ff88',
        level: 0,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const regen = (lvl * REGEN_STEP).toFixed(2);
            const nextRegen = ((lvl + 1) * REGEN_STEP).toFixed(2);
            return regen + ' HP/s → ' + nextRegen + ' HP/s';
        },
        apply: function() {
            this.level++;
            player.regenPerSec += REGEN_STEP;
        },
    },
];

// --------------- Super Powerups (#55) ---------------
// Super upgrade constants
const SUPER_BEAM_AURA_RADIUS_BASE = 50;
const SUPER_BEAM_AURA_RADIUS_STEP = 10;
const SUPER_BEAM_AURA_DMG_BASE = 10;
const SUPER_BEAM_AURA_DMG_STEP = 5;
const SUPER_BULWARK_REDUCTION_BASE = 0.15;
const SUPER_BULWARK_HEAL_BASE = 30;
const SUPER_BULWARK_HEAL_STEP = 15;
const SUPER_BULWARK_COOLDOWN_BASE = 15;
const SUPER_BULWARK_COOLDOWN_STEP = 2;
const SUPER_VACUUM_RADIUS_BASE = 200;
const SUPER_VACUUM_RADIUS_STEP = 30;
const SUPER_VACUUM_EXPLOSION_RADIUS_BASE = 40;
const SUPER_VACUUM_EXPLOSION_RADIUS_STEP = 10;
const SUPER_ARC_DAMAGE_BASE = 15;
const SUPER_ARC_DAMAGE_STEP = 8;
const SUPER_ARC_RANGE_BASE = 150;
const SUPER_ARC_RANGE_STEP = 20;
const SUPER_STORM_RADIUS_BASE = 80;
const SUPER_STORM_RADIUS_STEP = 15;
const SUPER_STORM_SPEED_MULT_BASE = 1.3;
const SUPER_STORM_SPEED_MULT_STEP = 0.2;
const SUPER_STORM_BURST_SPEED_BASE = 1.5;
const SUPER_STORM_BURST_SPEED_STEP = 0.25;
const SUPER_STORM_BURST_DURATION = 0.5;

const SUPER_POWERUPS = [
    {
        id: 'radiantBeam',
        name: 'Radiant Beam',
        description: 'Beam gains aura damage along its length',
        color: '#ff66cc',
        level: 0,
        isSuper: true,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const radius = SUPER_BEAM_AURA_RADIUS_BASE + ((lvl - 1) * SUPER_BEAM_AURA_RADIUS_STEP);
            const dmg = SUPER_BEAM_AURA_DMG_BASE + ((lvl - 1) * SUPER_BEAM_AURA_DMG_STEP);
            const nextRadius = radius + SUPER_BEAM_AURA_RADIUS_STEP;
            const nextDmg = dmg + SUPER_BEAM_AURA_DMG_STEP;
            return 'Aura R:' + radius + ' D:' + dmg + ' → R:' + nextRadius + ' D:' + nextDmg;
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('radiant_beam')) {
                player.weapons.push('radiant_beam');
            }
            player.radiantBeamLevel = this.level;
        },
    },
    {
        id: 'bulwark',
        name: 'Bulwark',
        description: '+15% damage reduction + emergency heal below 25% HP',
        color: '#6688aa',
        level: 0,
        isSuper: true,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const heal = SUPER_BULWARK_HEAL_BASE + ((lvl - 1) * SUPER_BULWARK_HEAL_STEP);
            const cd = Math.max(5, SUPER_BULWARK_COOLDOWN_BASE - ((lvl - 1) * SUPER_BULWARK_COOLDOWN_STEP));
            const nextHeal = heal + SUPER_BULWARK_HEAL_STEP;
            const nextCd = Math.max(5, cd - SUPER_BULWARK_COOLDOWN_STEP);
            return 'Heal ' + heal + ' CD ' + cd + 's → Heal ' + nextHeal + ' CD ' + nextCd + 's';
        },
        apply: function() {
            this.level++;
            player.bulwarkLevel = this.level;
        },
    },
    {
        id: 'vacuumNova',
        name: 'Vacuum Nova',
        description: 'Explosions pull XP gems and chain secondary blasts',
        color: '#ffaa44',
        level: 0,
        isSuper: true,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const radius = SUPER_VACUUM_RADIUS_BASE + ((lvl - 1) * SUPER_VACUUM_RADIUS_STEP);
            const expRadius = SUPER_VACUUM_EXPLOSION_RADIUS_BASE + ((lvl - 1) * SUPER_VACUUM_EXPLOSION_RADIUS_STEP);
            const nextRadius = radius + SUPER_VACUUM_RADIUS_STEP;
            const nextExpRadius = expRadius + SUPER_VACUUM_EXPLOSION_RADIUS_STEP;
            return 'Pull ' + radius + ' Chain R:' + expRadius + ' → Pull ' + nextRadius + ' Chain R:' + nextExpRadius;
        },
        apply: function() {
            this.level++;
            player.vacuumNovaLevel = this.level;
        },
    },
    {
        id: 'arcLance',
        name: 'Arc Lance',
        description: 'Piercing bolts chain lightning to nearby enemies',
        color: '#44aaff',
        level: 0,
        isSuper: true,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const dmg = SUPER_ARC_DAMAGE_BASE + ((lvl - 1) * SUPER_ARC_DAMAGE_STEP);
            const range = SUPER_ARC_RANGE_BASE + ((lvl - 1) * SUPER_ARC_RANGE_STEP);
            const nextDmg = dmg + SUPER_ARC_DAMAGE_STEP;
            const nextRange = range + SUPER_ARC_RANGE_STEP;
            return 'Arc D:' + dmg + ' R:' + range + ' → D:' + nextDmg + ' R:' + nextRange;
        },
        apply: function() {
            this.level++;
            player.arcLanceLevel = this.level;
        },
    },
    {
        id: 'stormdancer',
        name: 'Stormdancer',
        description: 'Faster, larger orbit orbs; hits grant speed burst',
        color: '#aa66ff',
        level: 0,
        isSuper: true,
        describe: function(lvl) {
            if (lvl === 0) return this.description;
            const radius = SUPER_STORM_RADIUS_BASE + ((lvl - 1) * SUPER_STORM_RADIUS_STEP);
            const speedMult = SUPER_STORM_SPEED_MULT_BASE + ((lvl - 1) * SUPER_STORM_SPEED_MULT_STEP);
            const burst = SUPER_STORM_BURST_SPEED_BASE + ((lvl - 1) * SUPER_STORM_BURST_SPEED_STEP);
            const nextRadius = radius + SUPER_STORM_RADIUS_STEP;
            const nextSpeedMult = speedMult + SUPER_STORM_SPEED_MULT_STEP;
            const nextBurst = burst + SUPER_STORM_BURST_SPEED_STEP;
            return 'R:' + radius + ' SPD×' + speedMult.toFixed(1) + ' BURST+' + Math.round((burst - 1) * 100) + '% → R:' + nextRadius + ' SPD×' + nextSpeedMult.toFixed(1) + ' BURST+' + Math.round((nextBurst - 1) * 100) + '%';
        },
        apply: function() {
            this.level++;
            if (!player.weapons.includes('stormdancer_orbit')) {
                player.weapons.push('stormdancer_orbit');
            }
            player.stormdancerLevel = this.level;
        },
    },
];

// Super powerup parent pairs mapping
const SUPER_PAIRS = {
    radiantBeam: ['beam', 'aura'],
    bulwark: ['armor', 'regen'],
    vacuumNova: ['explosion', 'xpRange'],
    arcLance: ['piercing', 'spark'],
    stormdancer: ['orbit', 'moveSpeed'],
};

// Global super unlock tracking
let superUnlocked = {};
let superUnlockQueue = [];

// --------------- Game State ---------------
let game, player, enemies, projectiles, xpGems, particles, levelUpCards, chests, explosions, beams;
let rewardDialog = null; // { upgrades: [...], headerText: string, celebrationRarity: string, openTime: number }
let selectedPowerupIndex = -1;
let levelUpOpenTime = 0;
let enemyIdCounter = 0;

function resetGameState() {
    game = {
        state: 'MENU', // MENU, PLAYING, PAUSED_LEVELUP, PAUSED_CHEST, GAME_OVER
        lastTime: 0,
        camera: { x: 0, y: 0 },
        enemySpawnTimer: 0,
        survivalTime: 0,
        killCount: 0,
        shakeTimer: 0,
        shakeMagnitude: 0,
        chestSpawnTimer: 0,
        nextChestInterval: CHEST_MIN_INTERVAL + Math.random() * (CHEST_MAX_INTERVAL - CHEST_MIN_INTERVAL),
        weaponTimers: {
            magic_bolt: 0,
            piercing_bolt: 0,
            bouncing_spark: 0,
        },
        orbitAngle: 0,
    };

    player = {
        x: 0,
        y: 0,
        radius: PLAYER_RADIUS,
        speed: PLAYER_SPEED,
        color: PLAYER_COLOR,
        targetX: 0,
        targetY: 0,
        moving: false,
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        invincibleUntil: 0,
        xp: 0,
        level: 1,
        weapons: ['magic_bolt'],
        magnetRadius: XP_MAGNET_BASE,
        explosionRadius: 0,
        auraLevel: 0,
        auraTimer: 0,
        beamLevel: 0,
        beamTimer: 0,
        armor: 0,
        regenPerSec: 0,
        // Per-weapon levels for stacking (#43)
        piercingBoltLevel: 0,
        orbitShieldLevel: 0,
        sparkLevel: 0,
        // Super powerup levels (#55)
        radiantBeamLevel: 0,
        bulwarkLevel: 0,
        vacuumNovaLevel: 0,
        arcLanceLevel: 0,
        stormdancerLevel: 0,
        // Bulwark cooldown tracking
        bulwarkLastHealTime: -999,
        // Stormdancer speed burst tracking
        stormdancerBurstTimer: 0,
        stormdancerSpeedMult: 1,
    };

    enemies = [];
    projectiles = [];
    xpGems = [];
    particles = [];
    levelUpCards = [];
    selectedPowerupIndex = -1;
    levelUpOpenTime = 0;
    chests = [];
    explosions = [];
    beams = [];
    window.arcLanceArcs = []; // #55 Arc Lance visual arcs
    enemyIdCounter = 0;

    // Reset powerup levels for new game (#43)
    for (const p of POWERUPS) {
        p.level = 0;
    }
    // Reset super powerup levels for new game (#55)
    for (const s of SUPER_POWERUPS) {
        s.level = 0;
    }
    superUnlocked = {};
    superUnlockQueue = [];
}

resetGameState();

// --------------- Super Unlock Detection (#55) ---------------
function getPowerupById(id) {
    for (const p of POWERUPS) {
        if (p.id === id) return p;
    }
    for (const s of SUPER_POWERUPS) {
        if (s.id === id) return s;
    }
    return null;
}

function checkSuperUnlocks() {
    // Check each super pair - if both parents are L5 and super not yet unlocked
    for (const superId in SUPER_PAIRS) {
        if (superUnlocked[superId]) continue;
        
        const parents = SUPER_PAIRS[superId];
        const parentA = getPowerupById(parents[0]);
        const parentB = getPowerupById(parents[1]);
        
        if (parentA && parentB && parentA.level >= 5 && parentB.level >= 5) {
            // Set unlock flag BEFORE any dialog to prevent double-award
            superUnlocked[superId] = true;
            
            const superPowerup = getPowerupById(superId);
            if (superPowerup) {
                // Apply the super at L1
                superPowerup.apply();
                
                // Queue the reward dialog
                superUnlockQueue.push({
                    upgrades: [superPowerup],
                    headerText: 'SUPER UPGRADE UNLOCKED',
                    celebrationRarity: 'rare',
                });
            }
        }
    }
    
    // Process queue if not currently showing a dialog
    processSuperUnlockQueue();
}

function processSuperUnlockQueue() {
    if (superUnlockQueue.length === 0) return;
    if (rewardDialog) return; // Already showing a dialog, wait for it to close
    
    const nextReward = superUnlockQueue.shift();
    showRewardDialog(nextReward);
}

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
        damage: MAGIC_BOLT_DAMAGE,
        maxRange: MAGIC_BOLT_RANGE,
        distanceTraveled: 0,
        pierceCount: 0,
        bouncesRemaining: 0,
        color: '#ffffff',
        hitEnemies: new Set(),
    });
}

function firePiercingBolt() {
    // Fires bolts based on piercingBoltLevel: 2 + (level - 1) additional bolts (#43)
    const boltCount = 2 + Math.max(0, player.piercingBoltLevel - 1);
    const baseDirs = [{ x: -1, y: 0 }, { x: 1, y: 0 }];
    
    // Always fire left/right, add diagonal bolts for higher levels
    const dirs = [...baseDirs];
    if (player.piercingBoltLevel >= 2) {
        dirs.push({ x: 0, y: -1 }); // up
        dirs.push({ x: 0, y: 1 });  // down
    }
    if (player.piercingBoltLevel >= 3) {
        dirs.push({ x: -0.707, y: -0.707 }); // up-left
        dirs.push({ x: 0.707, y: -0.707 });  // up-right
        dirs.push({ x: -0.707, y: 0.707 });  // down-left
        dirs.push({ x: 0.707, y: 0.707 });   // down-right
    }
    
    for (const dir of dirs) {
        projectiles.push({
            type: 'piercing_bolt',
            x: player.x,
            y: player.y,
            vx: dir.x * PIERCING_BOLT_SPEED,
            vy: dir.y * PIERCING_BOLT_SPEED,
            radius: PIERCING_BOLT_RADIUS,
            damage: PIERCING_BOLT_DAMAGE,
            maxRange: PIERCING_BOLT_RANGE,
            distanceTraveled: 0,
            pierceCount: PIERCING_BOLT_MAX_PIERCE,
            bouncesRemaining: 0,
            color: '#ff8844',
            hitEnemies: new Set(),
            isPiercing: true, // #55 Arc Lance detection
        });
    }
}

function fireBouncingSpark() {
    if (enemies.length === 0) return;
    Sound.playAttack();
    const target = findNearestEnemy(player.x, player.y);
    if (!target) return;
    const dir = normalize(target.x - player.x, target.y - player.y);
    // Bounces increase with sparkLevel (#43)
    const bounces = SPARK_MAX_BOUNCES + Math.max(0, player.sparkLevel - 1);
    projectiles.push({
        type: 'bouncing_spark',
        x: player.x,
        y: player.y,
        vx: dir.x * SPARK_SPEED,
        vy: dir.y * SPARK_SPEED,
        radius: SPARK_RADIUS,
        damage: SPARK_DAMAGE,
        maxRange: SPARK_RANGE,
        distanceTraveled: 0,
        pierceCount: 0,
        bouncesRemaining: bounces,
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
    isDragging = false; // Reset drag state when entering modal state (#60)
    levelUpCards = [];
    selectedPowerupIndex = -1;
    levelUpOpenTime = performance.now();

    // Build eligible pool: regular powerups + unlocked supers (#55)
    const eligiblePowerups = [];
    for (const p of POWERUPS) {
        if (p.level < 5) {
            eligiblePowerups.push(p);
        }
    }
    for (const s of SUPER_POWERUPS) {
        if (superUnlocked[s.id] && s.level < 5) {
            eligiblePowerups.push(s);
        }
    }

    // Shuffle and dedup to get CARD_COUNT unique powerups
    const shuffled = eligiblePowerups.slice().sort(function() { return Math.random() - 0.5; });
    const selected = [];
    const seenIds = {};
    for (const p of shuffled) {
        if (!seenIds[p.id]) {
            seenIds[p.id] = true;
            selected.push(p);
            if (selected.length >= CARD_COUNT) break;
        }
    }

    // If we don't have enough unique powerups, fill with random ones (may show duplicates)
    while (selected.length < CARD_COUNT && eligiblePowerups.length > 0) {
        const p = eligiblePowerups[Math.floor(Math.random() * eligiblePowerups.length)];
        selected.push(p);
    }

    if (isPortrait) {
        // Portrait/mobile: stack cards vertically with smaller dimensions
        const cardW = Math.min(CARD_WIDTH, canvas.width * 0.7);
        const cardH = Math.min(120, (canvas.height - 220) / CARD_COUNT - 12);
        const gap = 12;
        const totalHeight = CARD_COUNT * cardH + (CARD_COUNT - 1) * gap;
        const startX = (canvas.width - cardW) / 2;
        const startY = (canvas.height - totalHeight) / 2 + 30;

        for (let i = 0; i < selected.length; i++) {
            const powerup = selected[i];
            const levelLabel = powerup.level > 0 ? 'Lv ' + powerup.level + ' → Lv ' + (powerup.level + 1) : '';
            levelUpCards.push({
                x: startX,
                y: startY + i * (cardH + gap),
                width: cardW,
                height: cardH,
                powerup: powerup,
                hovered: false,
                levelLabel: levelLabel,
            });
        }
    } else {
        // Landscape/desktop: horizontal row
        const totalWidth = CARD_COUNT * CARD_WIDTH + (CARD_COUNT - 1) * CARD_GAP;
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - CARD_HEIGHT) / 2;

        for (let i = 0; i < selected.length; i++) {
            const powerup = selected[i];
            const levelLabel = powerup.level > 0 ? 'Lv ' + powerup.level + ' → Lv ' + (powerup.level + 1) : '';
            levelUpCards.push({
                x: startX + i * (CARD_WIDTH + CARD_GAP),
                y: startY,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                powerup: powerup,
                hovered: false,
                levelLabel: levelLabel,
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
        const cardH = Math.min(120, (canvas.height - 220) / CARD_COUNT - 12);
        const gap = 12;
        const totalHeight = CARD_COUNT * cardH + (CARD_COUNT - 1) * gap;
        const startX = (canvas.width - cardW) / 2;
        const startY = (canvas.height - totalHeight) / 2 + 30;

        for (let i = 0; i < powerups.length; i++) {
            const powerup = powerups[i];
            const levelLabel = powerup.level > 0 ? 'Lv ' + powerup.level + ' → Lv ' + (powerup.level + 1) : '';
            levelUpCards.push({
                x: startX,
                y: startY + i * (cardH + gap),
                width: cardW,
                height: cardH,
                powerup: powerup,
                hovered: false,
                levelLabel: levelLabel,
            });
        }
    } else {
        const totalWidth = CARD_COUNT * CARD_WIDTH + (CARD_COUNT - 1) * CARD_GAP;
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - CARD_HEIGHT) / 2;

        for (let i = 0; i < powerups.length; i++) {
            const powerup = powerups[i];
            const levelLabel = powerup.level > 0 ? 'Lv ' + powerup.level + ' → Lv ' + (powerup.level + 1) : '';
            levelUpCards.push({
                x: startX + i * (CARD_WIDTH + CARD_GAP),
                y: startY,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                powerup: powerup,
                hovered: false,
                levelLabel: levelLabel,
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
            // Check for super unlocks after any powerup apply (#55)
            checkSuperUnlocks();
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

// --------------- Reward Dialog (#54) ---------------
function showRewardDialog(reward) {
    // reward = { upgrades: [...], headerText: string, celebrationRarity: 'common'|'uncommon'|'rare' }
    isDragging = false; // Reset drag state when entering modal state (#60)
    game.state = 'PAUSED_CHEST';
    rewardDialog = {
        upgrades: reward.upgrades || [],
        headerText: reward.headerText || 'CHEST REWARD',
        celebrationRarity: reward.celebrationRarity || 'common',
        openTime: performance.now(),
    };
    layoutRewardDialog();
    triggerRewardCelebration(reward.celebrationRarity);
}

function layoutRewardDialog() {
    if (!rewardDialog) return;
    const upgradeCount = rewardDialog.upgrades.length;
    if (upgradeCount === 0) return;

    const small = canvas.width < 600;
    const dialogWidth = Math.min(REWARD_DIALOG_MAX_WIDTH, canvas.width - 40);
    const itemHeight = small ? 50 : REWARD_DIALOG_ITEM_HEIGHT;
    const itemGap = small ? 8 : REWARD_DIALOG_ITEM_GAP;
    const padding = small ? 16 : REWARD_DIALOG_PADDING;

    // Calculate grid layout: 2 columns for 4-5 items, 1 column for fewer
    const cols = (isPortrait && upgradeCount >= 4) ? 2 : (upgradeCount > 3 ? 2 : 1);
    const rows = Math.ceil(upgradeCount / cols);

    const contentWidth = dialogWidth - padding * 2;
    const itemWidth = cols === 1 ? contentWidth : (contentWidth - itemGap) / 2;

    rewardDialog.layout = {
        dialogWidth: dialogWidth,
        itemWidth: itemWidth,
        itemHeight: itemHeight,
        itemGap: itemGap,
        padding: padding,
        cols: cols,
        rows: rows,
    };

    // Calculate dialog height based on content
    const headerHeight = small ? 60 : 80;
    const contentHeight = rows * itemHeight + (rows - 1) * itemGap;
    const buttonHeight = small ? 50 : 60;
    const dialogHeight = headerHeight + contentHeight + buttonHeight + padding * 2;

    rewardDialog.layout.dialogHeight = dialogHeight;
    rewardDialog.layout.x = (canvas.width - dialogWidth) / 2;
    rewardDialog.layout.y = (canvas.height - dialogHeight) / 2;
    rewardDialog.layout.headerHeight = headerHeight;
    rewardDialog.layout.buttonY = rewardDialog.layout.y + headerHeight + contentHeight + padding;
}

function triggerRewardCelebration(rarity) {
    if (rarity === CHEST_RARITY_COMMON) return;
    if (typeof Sound !== 'undefined' && Sound.playChestOpen) Sound.playChestOpen();

    const isRare = rarity === CHEST_RARITY_RARE;
    game.shakeTimer = isRare ? 0.5 : 0.25;
    game.shakeMagnitude = isRare ? 8 : 4;

    const palette = isRare
        ? ['#ffd700', '#ffa500', '#cc44ff', '#ff44cc', '#ffffff']
        : ['#44ffff', '#44aaff', '#44ff88', '#88ffcc', '#ffffff'];
    const confettiCount = isRare ? 40 : 20;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let c = 0; c < confettiCount; c++) {
        const cAngle = Math.random() * Math.PI * 2;
        const cSpeed = 80 + Math.random() * 140;
        particles.push({
            type: 'confetti',
            x: centerX,
            y: centerY,
            vx: Math.cos(cAngle) * cSpeed,
            vy: Math.sin(cAngle) * cSpeed - 80,
            color: palette[Math.floor(Math.random() * palette.length)],
            w: 5 + Math.random() * 4,
            h: 3 + Math.random() * 3,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 10,
            lifetime: REWARD_DIALOG_CELEBRATION_DURATION * (0.8 + Math.random() * 0.4),
            maxLifetime: REWARD_DIALOG_CELEBRATION_DURATION * 1.2,
        });
    }

    if (isRare) {
        const sparkleCount = 12;
        for (let s = 0; s < sparkleCount; s++) {
            const sAngle = (s / sparkleCount) * Math.PI * 2 + Math.random() * 0.2;
            const sSpeed = 60 + Math.random() * 80;
            particles.push({
                type: 'sparkle',
                x: centerX,
                y: centerY,
                vx: Math.cos(sAngle) * sSpeed,
                vy: Math.sin(sAngle) * sSpeed,
                color: ['#ffd700', '#cc44ff', '#ff44cc', '#ffffff'][s % 4],
                size: 6 + Math.random() * 5,
                lifetime: REWARD_DIALOG_CELEBRATION_DURATION * 0.7,
                maxLifetime: REWARD_DIALOG_CELEBRATION_DURATION * 0.7,
            });
        }
    }
}

function handleRewardDialogClick(clickX, clickY) {
    if (!rewardDialog || !rewardDialog.layout) return false;
    // Guard against stray clicks when dialog just opened (200ms)
    if (performance.now() - rewardDialog.openTime < 200) return false;

    const layout = rewardDialog.layout;
    const small = canvas.width < 600;
    const btnW = small ? 140 : 180;
    const btnH = small ? 36 : 44;
    const btnX = canvas.width / 2 - btnW / 2;
    const btnY = layout.buttonY + (small ? 8 : 10);

    if (clickX >= btnX && clickX <= btnX + btnW &&
        clickY >= btnY && clickY <= btnY + btnH) {
        closeRewardDialog();
        return true;
    }
    return false;
}

function closeRewardDialog() {
    rewardDialog = null;
    game.state = 'PLAYING';
    // Process any queued super unlocks (#55)
    processSuperUnlockQueue();
}

function dismissRewardDialogWithKeyboard() {
    if (!rewardDialog) return false;
    // Guard against early dismissal
    if (performance.now() - rewardDialog.openTime < 200) return false;
    closeRewardDialog();
    return true;
}

// --------------- Input ---------------
let isDragging = false;
let touchHandledThisFrame = false; // Prevent double-fire between touch and pointer events (#60)

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

    if (game.state === 'PAUSED_CHEST') {
        handleRewardDialogClick(screenX, screenY);
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

    if (game.state === 'MENU' || game.state === 'GAME_OVER' || game.state === 'PAUSED_LEVELUP' || game.state === 'PAUSED_CHEST') {
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

    // Drag-to-move: update target while dragging (guard against paused states)
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

// --- Touch events (#18, #24, #60) ---
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touchHandledThisFrame = true; // Mark touch as handled for this frame (#60)
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;

    if (game.state === 'MENU' || game.state === 'GAME_OVER' || game.state === 'PAUSED_LEVELUP' || game.state === 'PAUSED_CHEST') {
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
    // Fallback: dispatch click for modal states if touchstart didn't fire (#60)
    if (game.state === 'PAUSED_LEVELUP' || game.state === 'PAUSED_CHEST') {
        if (e.changedTouches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.changedTouches[0];
            const sx = touch.clientX - rect.left;
            const sy = touch.clientY - rect.top;
            handleGameClick(sx, sy);
        }
    }
    isDragging = false;
}, { passive: false });

// --- Pointer events fallback (#60) ---
canvas.addEventListener('pointerdown', function(e) {
    // Skip if touch was already handled this frame (prevents double-fire)
    if (e.pointerType === 'touch' && touchHandledThisFrame) {
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (game.state === 'MENU' || game.state === 'GAME_OVER' || game.state === 'PAUSED_LEVELUP' || game.state === 'PAUSED_CHEST') {
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

// Reset touch handled flag at the start of each frame
canvas.addEventListener('pointerup', function() {
    // Small delay to ensure any touch events in the same frame complete first
    requestAnimationFrame(function() {
        touchHandledThisFrame = false;
    });
});

// --------------- Keyboard Input (#54) ---------------
window.addEventListener('keydown', function(e) {
    if (game.state === 'PAUSED_CHEST') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dismissRewardDialogWithKeyboard();
        }
    }
    if (game.state === 'PAUSED_LEVELUP') {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            // Simulate confirm button click if a card is selected
            if (selectedPowerupIndex >= 0 && levelUpCards.length > 0) {
                levelUpCards[selectedPowerupIndex].powerup.apply();
                game.state = 'PLAYING';
                levelUpCards = [];
                selectedPowerupIndex = -1;
            }
        }
    }
});

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

// --------------- Treasure Chests (#27) ---------------
function spawnChest() {
    if (chests.length >= CHEST_MAX_COUNT) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = CHEST_SPAWN_DIST_MIN + Math.random() * (CHEST_SPAWN_DIST_MAX - CHEST_SPAWN_DIST_MIN);
    let cx = player.x + Math.cos(angle) * dist;
    let cy = player.y + Math.sin(angle) * dist;
    
    // Roll rarity based on weighted odds (#46)
    const roll = Math.random();
    let rarity, rewardCount;
    if (roll < 0.70) {
        rarity = CHEST_RARITY_COMMON;
        rewardCount = 1;
    } else if (roll < 0.95) {
        rarity = CHEST_RARITY_UNCOMMON;
        rewardCount = 3;
    } else {
        rarity = CHEST_RARITY_RARE;
        rewardCount = 5;
    }
    
    chests.push({ x: cx, y: cy, width: CHEST_WIDTH, height: CHEST_HEIGHT, rarity: rarity, rewardCount: rewardCount });
}

function updateChests(dt) {
    game.chestSpawnTimer += dt;
    if (game.chestSpawnTimer >= game.nextChestInterval) {
        game.chestSpawnTimer = 0;
        game.nextChestInterval = CHEST_MIN_INTERVAL + Math.random() * (CHEST_MAX_INTERVAL - CHEST_MIN_INTERVAL);
        spawnChest();
    }

    for (let i = chests.length - 1; i >= 0; i--) {
        const chest = chests[i];
        // Circle-rect collision with player
        const closestX = Math.max(chest.x - chest.width / 2, Math.min(player.x, chest.x + chest.width / 2));
        const closestY = Math.max(chest.y - chest.height / 2, Math.min(player.y, chest.y + chest.height / 2));
        const dx = player.x - closestX;
        const dy = player.y - closestY;
        if (dx * dx + dy * dy < player.radius * player.radius) {
            // Collect chest - award upgrades from owned pool (#46, #54)
            const ownedUpgrades = POWERUPS.filter(function(p) { return (p.level || 0) > 0; });
            const awardedUpgrades = [];

            if (ownedUpgrades.length > 0) {
                // Award rewardCount upgrades from owned pool (with replacement)
                for (let r = 0; r < chest.rewardCount; r++) {
                    const upgrade = ownedUpgrades[Math.floor(Math.random() * ownedUpgrades.length)];
                    upgrade.apply();
                    awardedUpgrades.push(upgrade);
                }
            } else {
                // Fallback: spawn XP gems if no owned upgrades (#46)
                for (let r = 0; r < chest.rewardCount; r++) {
                    const angle = (r / chest.rewardCount) * Math.PI * 2 + Math.random() * 0.3;
                    const speed = 80 + Math.random() * 60;
                    const gemValue = XP_BASE_VALUE * (1 + Math.floor(Math.random() * 3));
                    const gem = {
                        x: chest.x,
                        y: chest.y,
                        radius: XP_GEM_RADIUS,
                        color: XP_GEM_COLOR,
                        value: gemValue,
                        popVx: Math.cos(angle) * speed,
                        popVy: Math.sin(angle) * speed,
                        popTimer: 0.4,
                    };
                    xpGems.push(gem);
                }
            }

            // Sparkle particles at pickup location
            for (let s = 0; s < 8; s++) {
                const pAngle = Math.random() * Math.PI * 2;
                const pSpeed = 60 + Math.random() * 80;
                particles.push({
                    type: 'xp_burst',
                    x: chest.x,
                    y: chest.y,
                    vx: Math.cos(pAngle) * pSpeed,
                    vy: Math.sin(pAngle) * pSpeed,
                    color: '#ffcc00',
                    size: 4 + Math.random() * 3,
                    lifetime: 0.4 + Math.random() * 0.2,
                    maxLifetime: 0.5,
                });
            }

            // Show reward dialog (#54)
            const rarityLabel = chest.rarity === CHEST_RARITY_COMMON ? 'Common' :
                               (chest.rarity === CHEST_RARITY_UNCOMMON ? 'Uncommon' : 'Rare');
            showRewardDialog({
                upgrades: awardedUpgrades,
                headerText: 'CHEST REWARD — ' + rarityLabel,
                celebrationRarity: chest.rarity,
            });

            // Check for super unlocks after chest awards (#55)
            checkSuperUnlocks();

            chests.splice(i, 1);
        }
    }
}

function renderChests() {
    for (const chest of chests) {
        const sp = worldToScreen(chest.x, chest.y);
        const rarity = chest.rarity || CHEST_RARITY_COMMON;
        const isRare = rarity === CHEST_RARITY_RARE;
        const isUncommon = rarity === CHEST_RARITY_UNCOMMON;
        const scale = isRare ? 1.15 : 1.0;
        const w = chest.width * scale;
        const h = chest.height * scale;
        const x = sp.x - w / 2;
        const y = sp.y - h / 2;
        const t = game.survivalTime;

        // Tier palette (#46)
        let bodyColor = '#8B4513';
        let lidColor = '#6B3410';
        let trimColor = '#FFD700';
        let glowColor = '#FFD700';
        let glowBase = 8;
        let glowPulse = 4;
        if (isUncommon) {
            bodyColor = '#2d6b4a';
            lidColor = '#1f4d79';
            trimColor = '#66ffcc';
            glowColor = '#44ddff';
            glowBase = 14;
            glowPulse = 6;
        } else if (isRare) {
            bodyColor = '#5a2a8a';
            lidColor = '#3d1a66';
            trimColor = '#ffd700';
            glowColor = '#cc66ff';
            glowBase = 22;
            glowPulse = 10;
        }

        // Outer glow halo (uncommon/rare)
        if (isUncommon || isRare) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowBase + glowPulse * (0.5 + 0.5 * Math.sin(t * 4));
            ctx.fillStyle = glowColor;
            ctx.globalAlpha = 0.22;
            ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
            ctx.restore();
        }

        // Chest body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x, y + 4, w, h - 4);

        // Lid
        ctx.fillStyle = lidColor;
        ctx.fillRect(x - 2, y, w + 4, 8);

        // Trim
        ctx.fillStyle = trimColor;
        ctx.fillRect(x + w / 2 - 4, y + 2, 8, 6);  // clasp
        ctx.fillRect(x + 2, y + h / 2 + 2, w - 4, 3);  // body band

        // Shimmer stripe (uncommon/rare)
        if (isUncommon || isRare) {
            const shimmer = 0.4 + 0.6 * Math.abs(Math.sin(t * 5));
            ctx.save();
            ctx.globalAlpha = shimmer;
            ctx.fillStyle = isRare ? '#ffe680' : '#b6fff0';
            ctx.fillRect(x + 2, y + 1, w - 4, 2);
            ctx.restore();
        }

        // Central clasp glow
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowBase + glowPulse * Math.sin(t * 3);
        ctx.fillStyle = glowColor;
        ctx.fillRect(x + w / 2 - 3, y + 3, 6, 4);
        ctx.restore();

        // Orbiting sparkle dots for rare
        if (isRare) {
            const cx = sp.x;
            const cy = sp.y;
            const orbitR = Math.max(w, h) * 0.85;
            const sparkleColors = ['#ffd700', '#cc66ff', '#ff66cc'];
            for (let i = 0; i < 3; i++) {
                const a = t * 2.2 + (i * Math.PI * 2) / 3;
                const px = cx + Math.cos(a) * orbitR;
                const py = cy + Math.sin(a) * orbitR * 0.5;
                ctx.save();
                ctx.shadowColor = sparkleColors[i];
                ctx.shadowBlur = 10;
                ctx.fillStyle = sparkleColors[i];
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
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
            // #55 Stormdancer speed burst
            const speedMult = player.stormdancerSpeedMult || 1;
            const step = player.speed * speedMult * dt;
            if (step >= d) {
                player.x = player.targetX;
                player.y = player.targetY;
                player.moving = false;
            } else {
                player.x += (dx / d) * step;
                player.y += (dy / d) * step;
            }
        }

    }

    // #55 Stormdancer speed burst decay
    if (player.stormdancerBurstTimer > 0) {
        player.stormdancerBurstTimer -= dt;
        if (player.stormdancerBurstTimer <= 0) {
            player.stormdancerSpeedMult = 1;
        }
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
                // Calculate damage reduction from armor and bulwark (#55)
                let reduction = player.armor;
                if (player.bulwarkLevel > 0) {
                    reduction += SUPER_BULWARK_REDUCTION_BASE;
                }
                reduction = Math.min(0.80, reduction); // Cap at 80% total
                
                const dmgAfterArmor = Math.max(1, contactDamage * (1 - reduction));
                player.hp -= dmgAfterArmor;
                Sound.playDamage();
                triggerScreenShake();
                
                // #55 Bulwark: emergency heal when HP drops below 25%
                if (player.bulwarkLevel > 0) {
                    const hpPercent = player.hp / player.maxHp;
                    if (hpPercent < 0.25) {
                        const cooldown = Math.max(5, SUPER_BULWARK_COOLDOWN_BASE - (player.bulwarkLevel - 1) * SUPER_BULWARK_COOLDOWN_STEP);
                        if (now - player.bulwarkLastHealTime >= cooldown) {
                            const healAmount = SUPER_BULWARK_HEAL_BASE + (player.bulwarkLevel - 1) * SUPER_BULWARK_HEAL_STEP;
                            player.hp = Math.min(player.maxHp, player.hp + healAmount);
                            player.bulwarkLastHealTime = now;
                            // Visual feedback
                            spawnDamageNumber(player.x, player.y - player.radius, healAmount);
                        }
                    }
                }
                
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
        game.weaponTimers.magic_bolt = MAGIC_BOLT_COOLDOWN;
    }

    // Piercing Bolt (#7)
    if (player.weapons.includes('piercing_bolt')) {
        game.weaponTimers.piercing_bolt -= dt;
        if (game.weaponTimers.piercing_bolt <= 0) {
            firePiercingBolt();
            game.weaponTimers.piercing_bolt = PIERCING_BOLT_COOLDOWN;
        }
    }

    // Bouncing Spark (#13)
    if (player.weapons.includes('bouncing_spark')) {
        game.weaponTimers.bouncing_spark -= dt;
        if (game.weaponTimers.bouncing_spark <= 0) {
            fireBouncingSpark();
            game.weaponTimers.bouncing_spark = SPARK_COOLDOWN;
        }
    }

    // Orbit Shield (#11, #43, #55)
    if (player.weapons.includes('orbit_shield') || player.weapons.includes('stormdancer_orbit')) {
        // Stormdancer modifies orbit speed and radius
        let orbitSpeedMult = 1;
        let orbitRadius = ORBIT_RADIUS;
        let orbCount = ORBIT_ORB_COUNT;
        
        if (player.stormdancerLevel > 0) {
            orbitSpeedMult = SUPER_STORM_SPEED_MULT_BASE + (player.stormdancerLevel - 1) * SUPER_STORM_SPEED_MULT_STEP;
            orbitRadius = SUPER_STORM_RADIUS_BASE + (player.stormdancerLevel - 1) * SUPER_STORM_RADIUS_STEP;
        }
        if (player.weapons.includes('orbit_shield')) {
            orbCount = ORBIT_ORB_COUNT + Math.max(0, player.orbitShieldLevel - 1);
        }
        
        game.orbitAngle += (2 * Math.PI / ORBIT_PERIOD) * dt * orbitSpeedMult;
        
        for (let i = 0; i < orbCount; i++) {
            const angle = game.orbitAngle + (i * Math.PI * 2 / orbCount);
            const orbX = player.x + Math.cos(angle) * orbitRadius;
            const orbY = player.y + Math.sin(angle) * orbitRadius;
            const orb = { x: orbX, y: orbY, radius: ORBIT_ORB_RADIUS };

            const nearbyOrb = queryNearby(enemyGrid, orbX, orbY, ORBIT_ORB_RADIUS + ENEMY_RADIUS);
            for (const idx of nearbyOrb) {
                const enemy = enemies[idx];
                if (!enemy) continue;
                if (circlesOverlap(orb, enemy)) {
                    const cooldownKey = 'orb_' + i + '_' + enemy.id;
                    if (!enemy[cooldownKey] || now - enemy[cooldownKey] >= ORBIT_HIT_COOLDOWN) {
                        enemy[cooldownKey] = now;
                        enemy.hp -= ORBIT_DAMAGE;
                        enemy.flashTimer = 0.05;
                        spawnDamageNumber(enemy.x, enemy.y - enemy.radius, ORBIT_DAMAGE);
                        
                        // #55 Stormdancer: speed burst on orb hit when 4+ orbs active
                        if (player.stormdancerLevel > 0 && orbCount >= 4) {
                            const burstMult = SUPER_STORM_BURST_SPEED_BASE + (player.stormdancerLevel - 1) * SUPER_STORM_BURST_SPEED_STEP;
                            player.stormdancerBurstTimer = SUPER_STORM_BURST_DURATION;
                            player.stormdancerSpeedMult = burstMult;
                        }
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

                if (player.explosionRadius > 0) {
                    triggerExplosion(enemy.x, enemy.y, player.explosionRadius, p.damage * EXPLOSION_DAMAGE_FRAC, enemy.id, enemyGrid);
                }

                // #55 Arc Lance: chain lightning from piercing bolt hits
                if (player.arcLanceLevel > 0 && p.isPiercing) {
                    const arcRange = SUPER_ARC_RANGE_BASE + (player.arcLanceLevel - 1) * SUPER_ARC_RANGE_STEP;
                    const arcDamage = SUPER_ARC_DAMAGE_BASE + (player.arcLanceLevel - 1) * SUPER_ARC_DAMAGE_STEP;
                    // Find nearest enemy to the hit enemy (excluding the one just hit)
                    let nearest = null;
                    let nearestDistSq = arcRange * arcRange;
                    for (const other of enemies) {
                        if (other.id === enemy.id) continue;
                        const odx = other.x - enemy.x;
                        const ody = other.y - enemy.y;
                        const odistSq = odx * odx + ody * ody;
                        if (odistSq < nearestDistSq) {
                            nearestDistSq = odistSq;
                            nearest = other;
                        }
                    }
                    if (nearest) {
                        nearest.hp -= arcDamage;
                        nearest.flashTimer = 0.05;
                        spawnDamageNumber(nearest.x, nearest.y - nearest.radius, arcDamage);
                        // Visual arc (store for rendering)
                        if (!window.arcLanceArcs) window.arcLanceArcs = [];
                        window.arcLanceArcs.push({
                            x1: enemy.x, y1: enemy.y,
                            x2: nearest.x, y2: nearest.y,
                            lifetime: 0.15,
                            maxLifetime: 0.15,
                        });
                    }
                }


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

        if (d < player.magnetRadius) {
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
        // #46 Confetti gravity + rotation
        if (p.type === 'confetti') {
            if (p.vy !== undefined) p.vy += 200 * dt;
            if (p.rotSpeed !== undefined) p.rotation = (p.rotation || 0) + p.rotSpeed * dt;
        }
        if (p.vx !== undefined) p.x += p.vx * dt;
        if (p.vy !== undefined) p.y += p.vy * dt;
    }

    // Treasure chests (#27)
    updateChests(dt);

    // Update popping gems
    for (const gem of xpGems) {
        if (gem.popTimer > 0) {
            gem.popTimer -= dt;
            gem.x += gem.popVx * dt;
            gem.y += gem.popVy * dt;
            gem.popVx *= 0.92;
            gem.popVy *= 0.92;
            if (gem.popTimer <= 0) {
                gem.popVx = 0;
                gem.popVy = 0;
            }
        }
    }

    // #26 HP Regeneration
    if (player.regenPerSec > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenPerSec * dt);
    }

    // #26 Pulsing Aura
    if (player.auraLevel > 0) {
        player.auraTimer -= dt;
        if (player.auraTimer <= 0) {
            player.auraTimer = AURA_INTERVAL;
            const radius = AURA_BASE_RADIUS + (player.auraLevel - 1) * AURA_STEP_RADIUS;
            const damage = (AURA_BASE_DAMAGE + (player.auraLevel - 1) * AURA_STEP_DAMAGE);
            const nearby = queryNearby(enemyGrid, player.x, player.y, radius + ENEMY_RADIUS);
            for (const idx of nearby) {
                const e = enemies[idx];
                if (!e) continue;
                const dx = e.x - player.x;
                const dy = e.y - player.y;
                if (dx * dx + dy * dy <= (radius + e.radius) * (radius + e.radius)) {
                    e.hp -= damage;
                    e.flashTimer = 0.05;
                    spawnDamageNumber(e.x, e.y - e.radius, damage);
                }
            }
            // #45 Aura pulse ring follows the player — mark so render anchors to player.x/y each frame
            explosions.push({ x: player.x, y: player.y, radius: 0, maxRadius: radius, lifetime: EXPLOSION_VISUAL_LIFETIME * 2, maxLifetime: EXPLOSION_VISUAL_LIFETIME * 2, color: AURA_COLOR, followPlayer: true });
        }
    }

    // #26 Beam / Laser
    beams.length = 0;
    if (player.weapons.includes('beam')) {
        const target = findNearestEnemy(player.x, player.y);
        if (target) {
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= BEAM_RANGE) {
                const dps = (BEAM_DPS_BASE + (player.beamLevel - 1) * BEAM_DPS_STEP);
                target.hp -= dps * dt;
                target.flashTimer = 0.05;
                player.beamTimer += dt;
                if (player.beamTimer >= 0.25) {
                    player.beamTimer = 0;
                    spawnDamageNumber(target.x, target.y - target.radius, dps * 0.25);
                }
                beams.push({ x1: player.x, y1: player.y, x2: target.x, y2: target.y });

                // #55 Radiant Beam: aura damage along beam length
                if (player.radiantBeamLevel > 0) {
                    const auraRadius = SUPER_BEAM_AURA_RADIUS_BASE + (player.radiantBeamLevel - 1) * SUPER_BEAM_AURA_RADIUS_STEP;
                    const auraDamage = (SUPER_BEAM_AURA_DMG_BASE + (player.radiantBeamLevel - 1) * SUPER_BEAM_AURA_DMG_STEP) * dt;
                    // Sample points along the beam line
                    const steps = Math.ceil(dist / 30);
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const sx = player.x + dx * t;
                        const sy = player.y + dy * t;
                        const nearbyBeam = queryNearby(enemyGrid, sx, sy, auraRadius + ENEMY_RADIUS);
                        for (const idx of nearbyBeam) {
                            const e = enemies[idx];
                            if (!e) continue;
                            // Check if enemy is within aura radius of the beam sample point
                            const edx = e.x - sx;
                            const edy = e.y - sy;
                            if (edx * edx + edy * edy <= auraRadius * auraRadius) {
                                // Avoid double-damage on the main target
                                if (e === target) continue;
                                e.hp -= auraDamage;
                                e.flashTimer = 0.05;
                            }
                        }
                    }
                }
            }
        }
    }

    // #26 Update explosion visuals
    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.lifetime -= dt;
        if (e.lifetime <= 0) explosions.splice(i, 1);
    }

    // Clean up dead enemies from aura / beam / explosion damage
    for (let j = enemies.length - 1; j >= 0; j--) {
        if (enemies[j].hp <= 0) {
            Sound.playEnemyDeath();
            spawnXpGem(enemies[j].x, enemies[j].y, enemies[j].xpDrop);
            spawnDeathParticles(enemies[j].x, enemies[j].y, enemies[j].color);
            enemies.splice(j, 1);
            game.killCount++;
        }
    }

    updateCamera();
}

// #26 AoE explosion helper
function triggerExplosion(cx, cy, radius, damage, sourceEnemyId, enemyGrid) {
    const nearby = queryNearby(enemyGrid, cx, cy, radius + ENEMY_RADIUS);
    let furthestEnemy = null;
    let furthestDistSq = 0;
    
    for (const idx of nearby) {
        const e = enemies[idx];
        if (!e) continue;
        if (e.id === sourceEnemyId) continue;
        const dx = e.x - cx;
        const dy = e.y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq <= (radius + e.radius) * (radius + e.radius)) {
            e.hp -= damage;
            e.flashTimer = 0.05;
            spawnDamageNumber(e.x, e.y - e.radius, damage);
            
            // Track furthest enemy for Vacuum Nova chain
            if (distSq > furthestDistSq) {
                furthestDistSq = distSq;
                furthestEnemy = e;
            }
        }
    }
    explosions.push({ x: cx, y: cy, radius: 0, maxRadius: radius, lifetime: EXPLOSION_VISUAL_LIFETIME, maxLifetime: EXPLOSION_VISUAL_LIFETIME, color: EXPLOSION_COLOR });
    
    // #55 Vacuum Nova: pull XP gems and chain secondary explosion
    if (player.vacuumNovaLevel > 0) {
        const vacuumRadius = SUPER_VACUUM_RADIUS_BASE + (player.vacuumNovaLevel - 1) * SUPER_VACUUM_RADIUS_STEP;
        // Pull XP gems toward player
        for (const gem of xpGems) {
            const gdx = gem.x - player.x;
            const gdy = gem.y - player.y;
            if (gdx * gdx + gdy * gdy <= vacuumRadius * vacuumRadius) {
                const dir = normalize(player.x - gem.x, player.y - gem.y);
                gem.x += dir.x * XP_GEM_MAGNET_SPEED * 0.5; // Pull speed
                gem.y += dir.y * XP_GEM_MAGNET_SPEED * 0.5;
            }
        }
        
        // Chain secondary explosion on furthest enemy hit
        if (furthestEnemy) {
            const chainRadius = SUPER_VACUUM_EXPLOSION_RADIUS_BASE + (player.vacuumNovaLevel - 1) * SUPER_VACUUM_EXPLOSION_RADIUS_STEP;
            const chainDamage = damage * 0.5;
            const chainNearby = queryNearby(enemyGrid, furthestEnemy.x, furthestEnemy.y, chainRadius + ENEMY_RADIUS);
            for (const idx of chainNearby) {
                const e = enemies[idx];
                if (!e) continue;
                if (e.id === furthestEnemy.id) continue; // Don't hit the source again
                const edx = e.x - furthestEnemy.x;
                const edy = e.y - furthestEnemy.y;
                if (edx * edx + edy * edy <= chainRadius * chainRadius) {
                    e.hp -= chainDamage;
                    e.flashTimer = 0.05;
                    spawnDamageNumber(e.x, e.y - e.radius, chainDamage);
                }
            }
            explosions.push({ x: furthestEnemy.x, y: furthestEnemy.y, radius: 0, maxRadius: chainRadius, lifetime: EXPLOSION_VISUAL_LIFETIME, maxLifetime: EXPLOSION_VISUAL_LIFETIME, color: '#ff6644' });
        }
    }
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

    // Draw treasure chests (#27)
    renderChests();

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

    // Draw orbit shield orbs (#11, #43, #55)
    if (player.weapons.includes('orbit_shield') || player.weapons.includes('stormdancer_orbit')) {
        let orbitRadius = ORBIT_RADIUS;
        let orbCount = ORBIT_ORB_COUNT;
        if (player.stormdancerLevel > 0) {
            orbitRadius = SUPER_STORM_RADIUS_BASE + (player.stormdancerLevel - 1) * SUPER_STORM_RADIUS_STEP;
        }
        if (player.weapons.includes('orbit_shield')) {
            orbCount = ORBIT_ORB_COUNT + Math.max(0, player.orbitShieldLevel - 1);
        }
        for (let i = 0; i < orbCount; i++) {
            const angle = game.orbitAngle + (i * Math.PI * 2 / orbCount);
            const orbX = player.x + Math.cos(angle) * orbitRadius;
            const orbY = player.y + Math.sin(angle) * orbitRadius;
            const spOrb = worldToScreen(orbX, orbY);
            ctx.fillStyle = player.stormdancerLevel > 0 ? '#aa66ff' : ORBIT_COLOR;
            ctx.beginPath();
            ctx.arc(spOrb.x, spOrb.y, ORBIT_ORB_RADIUS, 0, Math.PI * 2);
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

    // #26 XP magnet radius (faint)
    if (player.magnetRadius > XP_MAGNET_BASE) {
        ctx.strokeStyle = 'rgba(255, 238, 102, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, player.magnetRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // #26 Pulsing aura ring
    if (player.auraLevel > 0) {
        const auraR = AURA_BASE_RADIUS + (player.auraLevel - 1) * AURA_STEP_RADIUS;
        const progress = 1 - Math.max(0, player.auraTimer / AURA_INTERVAL);
        const alpha = 0.15 + 0.25 * progress;
        ctx.strokeStyle = AURA_COLOR;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, auraR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // #26 Explosions (expanding rings)
    for (const e of explosions) {
        // #45 Aura pulse visual follows the player; other explosions stay in world space.
        const ex = e.followPlayer ? player.x : e.x;
        const ey = e.followPlayer ? player.y : e.y;
        const esp = worldToScreen(ex, ey);
        const t = 1 - (e.lifetime / e.maxLifetime);
        const r = e.maxRadius * (0.3 + 0.7 * t);
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(esp.x, esp.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // #26 Beams
    for (const b of beams) {
        const s1 = worldToScreen(b.x1, b.y1);
        const s2 = worldToScreen(b.x2, b.y2);
        ctx.strokeStyle = BEAM_COLOR;
        ctx.lineWidth = BEAM_WIDTH;
        ctx.shadowColor = BEAM_COLOR;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // #55 Arc Lance: render chain lightning arcs
    if (window.arcLanceArcs) {
        for (let i = window.arcLanceArcs.length - 1; i >= 0; i--) {
            const arc = window.arcLanceArcs[i];
            arc.lifetime -= 0.016; // approximate dt for render
            if (arc.lifetime <= 0) {
                window.arcLanceArcs.splice(i, 1);
                continue;
            }
            const a1 = worldToScreen(arc.x1, arc.y1);
            const a2 = worldToScreen(arc.x2, arc.y2);
            const alpha = arc.lifetime / arc.maxLifetime;
            ctx.strokeStyle = '#44aaff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#44aaff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(a1.x, a1.y);
            // Draw jagged line
            const midX = (a1.x + a2.x) / 2 + (Math.random() - 0.5) * 10;
            const midY = (a1.y + a2.y) / 2 + (Math.random() - 0.5) * 10;
            ctx.lineTo(midX, midY);
            ctx.lineTo(a2.x, a2.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }

    // #26 Armor glow
    if (player.armor > 0) {
        ctx.strokeStyle = '#aabbcc';
        ctx.globalAlpha = 0.3 + player.armor * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, drawRadius + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

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
        } else if (p.type === 'confetti') {
            const psp = worldToScreen(p.x, p.y);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(psp.x, psp.y);
            ctx.rotate(p.rotation || 0);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
            ctx.globalAlpha = 1;
        } else if (p.type === 'sparkle') {
            const psp = worldToScreen(p.x, p.y);
            const grow = 1 + (1 - alpha) * 1.5;
            const r = (p.size || 6) * grow * 0.5;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(psp.x - r, psp.y);
            ctx.lineTo(psp.x + r, psp.y);
            ctx.moveTo(psp.x, psp.y - r);
            ctx.lineTo(psp.x, psp.y + r);
            ctx.moveTo(psp.x - r * 0.7, psp.y - r * 0.7);
            ctx.lineTo(psp.x + r * 0.7, psp.y + r * 0.7);
            ctx.moveTo(psp.x - r * 0.7, psp.y + r * 0.7);
            ctx.lineTo(psp.x + r * 0.7, psp.y - r * 0.7);
            ctx.stroke();
            ctx.restore();
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

    if (game.state === 'PAUSED_CHEST') {
        renderRewardDialog();
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

    // Version string - bottom right (#62)
    const savedFillStyle = ctx.fillStyle;
    const savedTextAlign = ctx.textAlign;
    const savedFont = ctx.font;
    const savedTextBaseline = ctx.textBaseline;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(BUILD_VERSION, canvas.width - 10, canvas.height - 10);

    ctx.fillStyle = savedFillStyle;
    ctx.textAlign = savedTextAlign;
    ctx.font = savedFont;
    ctx.textBaseline = savedTextBaseline;
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

        const isSuper = !!(card.powerup && card.powerup.isSuper);
        ctx.fillStyle = isSelected ? '#2a2a44' : (card.hovered ? '#333333' : (isSuper ? '#2d2818' : '#222222'));
        ctx.fillRect(card.x, card.y, card.width, card.height);

        if (isSuper) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
        } else {
            if (isSelected) {
                ctx.shadowColor = card.powerup.color;
                ctx.shadowBlur = 16;
            }
            ctx.strokeStyle = isSelected ? card.powerup.color : (card.hovered ? card.powerup.color : '#555555');
            ctx.lineWidth = isSelected ? 3 : (card.hovered ? 3 : 1);
        }
        ctx.strokeRect(card.x, card.y, card.width, card.height);
        ctx.shadowBlur = 0;

        // SUPER pill badge in top-right corner
        if (isSuper) {
            const pillText = 'SUPER';
            const pillFontSize = canvas.width < 600 ? 10 : 12;
            ctx.font = 'bold ' + pillFontSize + 'px sans-serif';
            const pillPadX = 6;
            const pillPadY = 3;
            const pillW = ctx.measureText(pillText).width + pillPadX * 2;
            const pillH = pillFontSize + pillPadY * 2;
            const pillR = 10;
            const pillX = card.x + card.width - pillW - 6;
            const pillY = card.y + 6;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(pillX + pillR, pillY);
            ctx.lineTo(pillX + pillW - pillR, pillY);
            ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillR, pillR);
            ctx.lineTo(pillX + pillW, pillY + pillH - pillR);
            ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - pillR, pillY + pillH, pillR);
            ctx.lineTo(pillX + pillR, pillY + pillH);
            ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - pillR, pillR);
            ctx.lineTo(pillX, pillY + pillR);
            ctx.arcTo(pillX, pillY, pillX + pillR, pillY, pillR);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pillText, pillX + pillW / 2, pillY + pillH / 2);
            ctx.textBaseline = 'alphabetic';
        }

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
        const descText = (typeof card.powerup.describe === 'function')
            ? card.powerup.describe(card.powerup.level || 0)
            : card.powerup.description;
        const words = descText.split(' ');
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
            lineY += small ? 14 : 18;
        }

        // Stack-level progression label (e.g. "Lv 2 → Lv 3")
        if (card.levelLabel) {
            ctx.fillStyle = card.powerup.color;
            ctx.font = 'bold ' + descSize + 'px sans-serif';
            ctx.fillText(card.levelLabel, card.x + card.width / 2, lineY + (small ? 4 : 6));
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

// --------------- Reward Dialog Render (#54) ---------------
function renderRewardDialog() {
    if (!rewardDialog || !rewardDialog.layout) return;

    const small = canvas.width < 600;
    const layout = rewardDialog.layout;

    // Backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dialog panel
    const px = layout.x;
    const py = layout.y;
    const pw = layout.dialogWidth;
    const ph = layout.dialogHeight;
    const pr = 12;

    ctx.fillStyle = '#1a1a2a';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(px + pr, py);
    ctx.lineTo(px + pw - pr, py);
    ctx.arcTo(px + pw, py, px + pw, py + pr, pr);
    ctx.lineTo(px + pw, py + ph - pr);
    ctx.arcTo(px + pw, py + ph, px + pw - pr, py + ph, pr);
    ctx.lineTo(px + pr, py + ph);
    ctx.arcTo(px, py + ph, px, py + ph - pr, pr);
    ctx.lineTo(px, py + pr);
    ctx.arcTo(px, py, px + pr, py, pr);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rarity-coloured border
    const rarityColors = {
        common: '#888888',
        uncommon: '#44ff44',
        rare: '#ffdd44',
    };
    const rarityColor = rarityColors[rewardDialog.celebrationRarity] || '#888888';
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Header (#55: gold pulse for SUPER UPGRADE UNLOCKED)
    const isSuperUnlock = rewardDialog.headerText === 'SUPER UPGRADE UNLOCKED';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (isSuperUnlock) {
        const baseSize = small ? 22 : 32;
        const superSize = Math.round(baseSize * 1.15);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 16 + Math.sin((game ? game.survivalTime : 0) * 4) * 6;
        ctx.font = 'bold ' + superSize + 'px sans-serif';
        ctx.fillText(rewardDialog.headerText, canvas.width / 2, py + (small ? 32 : 44));
        ctx.shadowBlur = 0;
    } else {
        ctx.fillStyle = rarityColor;
        ctx.font = 'bold ' + (small ? 22 : 32) + 'px sans-serif';
        ctx.fillText(rewardDialog.headerText, canvas.width / 2, py + (small ? 32 : 44));
    }

    // Rarity subtitle
    const rarityLabel = rewardDialog.celebrationRarity.charAt(0).toUpperCase() +
                        rewardDialog.celebrationRarity.slice(1);
    ctx.fillStyle = '#cccccc';
    ctx.font = (small ? 13 : 16) + 'px sans-serif';
    ctx.fillText(rarityLabel + ' \u2014 ' + rewardDialog.upgrades.length + ' upgrade' +
                 (rewardDialog.upgrades.length === 1 ? '' : 's'),
                 canvas.width / 2, py + (small ? 50 : 68));

    // Upgrade grid
    const contentTop = py + layout.headerHeight;
    const cols = layout.cols;
    const itemWidth = layout.itemWidth;
    const itemHeight = layout.itemHeight;
    const itemGap = layout.itemGap;
    const gridTotalWidth = cols * itemWidth + (cols - 1) * itemGap;
    const gridStartX = px + (pw - gridTotalWidth) / 2;

    for (let i = 0; i < rewardDialog.upgrades.length; i++) {
        const up = rewardDialog.upgrades[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const itemX = gridStartX + col * (itemWidth + itemGap);
        const itemY = contentTop + row * (itemHeight + itemGap);

        // Item background
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(itemX, itemY, itemWidth, itemHeight);
        ctx.strokeStyle = up.color || '#555555';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemWidth, itemHeight);

        // Icon
        const iconR = small ? 14 : 18;
        const iconCx = itemX + iconR + (small ? 8 : 12);
        const iconCy = itemY + itemHeight / 2;
        ctx.fillStyle = up.color || '#888888';
        ctx.beginPath();
        ctx.arc(iconCx, iconCy, iconR, 0, Math.PI * 2);
        ctx.fill();

        // Name
        const textX = iconCx + iconR + (small ? 8 : 12);
        const nameSize = small ? 13 : 15;
        const descSize = small ? 10 : 12;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold ' + nameSize + 'px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        const nameText = up.name + (typeof up.level === 'number' ? ' Lv ' + up.level : '');
        ctx.fillText(nameText, textX, itemY + (small ? 20 : 24));

        // Description (short, one line with ellipsis if needed)
        ctx.fillStyle = '#aaaaaa';
        ctx.font = descSize + 'px sans-serif';
        let descText = '';
        if (typeof up.describe === 'function') {
            try { descText = up.describe(up.level || 0) || ''; } catch (e) { descText = ''; }
        } else if (up.description) {
            descText = up.description;
        }
        const maxTextWidth = itemX + itemWidth - textX - 6;
        let shown = descText;
        if (ctx.measureText(shown).width > maxTextWidth) {
            while (shown.length > 1 && ctx.measureText(shown + '\u2026').width > maxTextWidth) {
                shown = shown.slice(0, -1);
            }
            shown = shown + '\u2026';
        }
        ctx.fillText(shown, textX, itemY + (small ? 38 : 44));
    }

    // Confirm button
    const btnW = small ? 140 : 180;
    const btnH = small ? 36 : 44;
    const btnX = canvas.width / 2 - btnW / 2;
    const btnY = layout.buttonY + (small ? 8 : 10);
    const br = 8;

    ctx.fillStyle = rarityColor;
    ctx.shadowColor = rarityColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(btnX + br, btnY);
    ctx.lineTo(btnX + btnW - br, btnY);
    ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + br, br);
    ctx.lineTo(btnX + btnW, btnY + btnH - br);
    ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - br, btnY + btnH, br);
    ctx.lineTo(btnX + br, btnY + btnH);
    ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - br, br);
    ctx.lineTo(btnX, btnY + br);
    ctx.arcTo(btnX, btnY, btnX + br, btnY, br);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#000000';
    ctx.font = 'bold ' + (small ? 16 : 20) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('CONTINUE', canvas.width / 2, btnY + btnH / 2 + (small ? 5 : 7));

    // Hint text
    ctx.fillStyle = '#666666';
    ctx.font = (small ? 11 : 13) + 'px sans-serif';
    ctx.fillText('Click / Tap / Enter to continue', canvas.width / 2, btnY + btnH + (small ? 16 : 20));
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

    // Owned upgrades list (right side) - #43 stacking upgrades, #55 super upgrades
    const owned = POWERUPS.filter(function(p) { return (p.level || 0) > 0; });
    const ownedSupers = SUPER_POWERUPS.filter(function(s) { return (s.level || 0) > 0; });
    const allOwned = owned.concat(ownedSupers);
    if (allOwned.length > 0) {
        const listX = canvas.width - (small ? 10 : 20);
        const lineH = small ? 12 : 15;
        const startY = (small ? 44 : 60);
        ctx.textAlign = 'right';
        ctx.font = 'bold ' + (small ? 10 : 12) + 'px sans-serif';
        for (let i = 0; i < allOwned.length; i++) {
            const p = allOwned[i];
            const y = startY + i * lineH;
            ctx.fillStyle = p.isSuper ? '#ffd700' : p.color;
            ctx.fillText((p.isSuper ? '★ ' : '') + p.name + ' ×' + p.level, listX, y);
        }
    }

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
