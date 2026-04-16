// ============================================================
// Survivor — Game Bootstrap & Core Loop
// ============================================================

// --------------- Constants ---------------
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const PLAYER_RADIUS = 16;
const PLAYER_COLOR = '#4488ff';
const PLAYER_SPEED = 200; // pixels per second
const BG_COLOR = '#111111';
const GRID_COLOR = '#1a1a1a';
const GRID_SIZE = 80;

// Enemy constants
const ENEMY_RADIUS = 12;
const ENEMY_COLOR = '#ff4444';
const ENEMY_SPEED = 80; // pixels per second
const ENEMY_HP = 30;
const ENEMY_SPAWN_INTERVAL = 2; // seconds between spawns
const ENEMY_SPAWN_MARGIN = 60; // pixels beyond viewport edge

// Combat constants
const CONTACT_DPS = 10; // damage per second on contact
const IFRAME_DURATION = 1.5; // invincibility duration in seconds
const PLAYER_MAX_HP = 100;

// Projectile constants
const MAGIC_BOLT_SPEED = 400;
const MAGIC_BOLT_RADIUS = 5;
const MAGIC_BOLT_DAMAGE = 15;
const MAGIC_BOLT_RANGE = 600;
const MAGIC_BOLT_COOLDOWN = 1.2; // seconds

// XP constants
const XP_GEM_RADIUS = 6;
const XP_GEM_COLOR = '#ffdd44';
const XP_GEM_VALUE = 5;
const XP_GEM_MAGNET_RANGE = 120;
const XP_GEM_MAGNET_SPEED = 300;

// Level thresholds
const XP_THRESHOLDS = [10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// --------------- Canvas Setup ---------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --------------- Game State ---------------
const game = {
    state: 'PLAYING', // MENU, PLAYING, PAUSED_LEVELUP, GAME_OVER
    lastTime: 0,
    camera: { x: 0, y: 0 },
    enemySpawnTimer: 0,
    weaponCooldown: 0,
    survivalTime: 0,
    killCount: 0,
};

const player = {
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
};

const enemies = [];
const projectiles = [];
const xpGems = [];

// --------------- Utility ---------------
function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function circleOverlap(a, b) {
    return dist(a, b) < a.radius + b.radius;
}

function normalize(dx, dy) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
}

// --------------- Camera ---------------
function updateCamera() {
    game.camera.x = player.x - canvas.width / 2;
    game.camera.y = player.y - canvas.height / 2;
}

function worldToScreen(wx, wy) {
    return {
        x: wx - game.camera.x,
        y: wy - game.camera.y,
    };
}

// --------------- Enemy Spawning ---------------
function spawnEnemy() {
    // Spawn from random position just outside the viewport
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let x, y;

    switch (side) {
        case 0: // top
            x = game.camera.x + Math.random() * canvas.width;
            y = game.camera.y - ENEMY_SPAWN_MARGIN;
            break;
        case 1: // right
            x = game.camera.x + canvas.width + ENEMY_SPAWN_MARGIN;
            y = game.camera.y + Math.random() * canvas.height;
            break;
        case 2: // bottom
            x = game.camera.x + Math.random() * canvas.width;
            y = game.camera.y + canvas.height + ENEMY_SPAWN_MARGIN;
            break;
        case 3: // left
            x = game.camera.x - ENEMY_SPAWN_MARGIN;
            y = game.camera.y + Math.random() * canvas.height;
            break;
    }

    // Clamp to world bounds
    x = Math.max(ENEMY_RADIUS, Math.min(WORLD_WIDTH - ENEMY_RADIUS, x));
    y = Math.max(ENEMY_RADIUS, Math.min(WORLD_HEIGHT - ENEMY_RADIUS, y));

    enemies.push({
        x: x,
        y: y,
        radius: ENEMY_RADIUS,
        speed: ENEMY_SPEED,
        color: ENEMY_COLOR,
        hp: ENEMY_HP,
        maxHp: ENEMY_HP,
    });
}

// --------------- Projectiles ---------------
function fireMagicBolt() {
    if (enemies.length === 0) return;

    // Find nearest enemy
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of enemies) {
        const d = dist(player, enemy);
        if (d < nearestDist) {
            nearestDist = d;
            nearest = enemy;
        }
    }

    if (!nearest) return;

    const dir = normalize(nearest.x - player.x, nearest.y - player.y);

    projectiles.push({
        x: player.x,
        y: player.y,
        vx: dir.x * MAGIC_BOLT_SPEED,
        vy: dir.y * MAGIC_BOLT_SPEED,
        radius: MAGIC_BOLT_RADIUS,
        damage: MAGIC_BOLT_DAMAGE * player.damageMultiplier,
        maxRange: MAGIC_BOLT_RANGE,
        distanceTraveled: 0,
        pierceCount: 0, // 0 = single target (destroyed on first hit)
        color: '#ffffff',
    });
}

// --------------- XP & Leveling ---------------
function getXpThreshold(level) {
    if (level - 1 < XP_THRESHOLDS.length) {
        return XP_THRESHOLDS[level - 1];
    }
    // Extend with formula for levels beyond the array
    return XP_THRESHOLDS[XP_THRESHOLDS.length - 1] + (level - XP_THRESHOLDS.length) * 300;
}

function spawnXpGem(x, y) {
    xpGems.push({
        x: x,
        y: y,
        radius: XP_GEM_RADIUS,
        color: XP_GEM_COLOR,
        value: XP_GEM_VALUE,
    });
}

// --------------- Input ---------------
canvas.addEventListener('click', (e) => {
    if (game.state !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + game.camera.x;
    const clickY = e.clientY - rect.top + game.camera.y;
    player.targetX = clickX;
    player.targetY = clickY;
    player.moving = true;
});

// --------------- Update ---------------
function update(dt) {
    if (game.state !== 'PLAYING') return;

    game.survivalTime += dt;

    // Player movement
    if (player.moving) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 2) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
        } else {
            const moveX = (dx / d) * player.speed * dt;
            const moveY = (dy / d) * player.speed * dt;

            if (Math.abs(moveX) > Math.abs(dx)) {
                player.x = player.targetX;
            } else {
                player.x += moveX;
            }
            if (Math.abs(moveY) > Math.abs(dy)) {
                player.y = player.targetY;
            } else {
                player.y += moveY;
            }
        }

        player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));
    }

    // Enemy spawning
    game.enemySpawnTimer += dt;
    if (game.enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
        game.enemySpawnTimer -= ENEMY_SPAWN_INTERVAL;
        spawnEnemy();
    }

    // Enemy AI: chase player
    for (const enemy of enemies) {
        const dir = normalize(player.x - enemy.x, player.y - enemy.y);
        enemy.x += dir.x * enemy.speed * dt;
        enemy.y += dir.y * enemy.speed * dt;
    }

    // Contact damage
    const now = game.survivalTime;
    for (const enemy of enemies) {
        if (circleOverlap(player, enemy)) {
            if (now >= player.invincibleUntil) {
                player.hp -= CONTACT_DPS * dt;
                if (player.hp <= 0) {
                    player.hp = 0;
                    game.state = 'GAME_OVER';
                    return;
                }
                player.invincibleUntil = now + IFRAME_DURATION;
            }
        }
    }

    // Weapon firing
    game.weaponCooldown -= dt;
    if (game.weaponCooldown <= 0) {
        fireMagicBolt();
        game.weaponCooldown = MAGIC_BOLT_COOLDOWN / player.fireRateMultiplier;
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const moveX = p.vx * dt;
        const moveY = p.vy * dt;
        p.x += moveX;
        p.y += moveY;
        p.distanceTraveled += Math.sqrt(moveX * moveX + moveY * moveY);

        // Remove if out of range
        if (p.distanceTraveled >= p.maxRange) {
            projectiles.splice(i, 1);
            continue;
        }

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (circleOverlap(p, enemies[j])) {
                enemies[j].hp -= p.damage;

                // Check if enemy died
                if (enemies[j].hp <= 0) {
                    spawnXpGem(enemies[j].x, enemies[j].y);
                    enemies.splice(j, 1);
                    game.killCount++;
                }

                // Remove projectile (single target)
                if (p.pierceCount <= 0) {
                    projectiles.splice(i, 1);
                    break;
                } else {
                    p.pierceCount--;
                }
            }
        }
    }

    // Update XP gems (magnetic pull + collection)
    for (let i = xpGems.length - 1; i >= 0; i--) {
        const gem = xpGems[i];
        const d = dist(player, gem);

        if (d < XP_GEM_MAGNET_RANGE) {
            // Magnetic pull toward player
            const dir = normalize(player.x - gem.x, player.y - gem.y);
            gem.x += dir.x * XP_GEM_MAGNET_SPEED * dt;
            gem.y += dir.y * XP_GEM_MAGNET_SPEED * dt;
        }

        if (circleOverlap(player, gem)) {
            player.xp += gem.value;

            // Check level up
            const threshold = getXpThreshold(player.level);
            if (player.xp >= threshold) {
                player.xp -= threshold;
                player.level++;
                game.state = 'PAUSED_LEVELUP';
            }

            xpGems.splice(i, 1);
        }
    }

    updateCamera();
}

// --------------- Render ---------------
function render() {
    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (world-space)
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
        ctx.fillStyle = enemy.color;
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

    // Draw player
    const sp = worldToScreen(player.x, player.y);
    // Flash white during i-frames
    const isInvincible = game.survivalTime < player.invincibleUntil;
    if (isInvincible && Math.floor(game.survivalTime * 10) % 2 === 0) {
        ctx.fillStyle = '#ffffff';
    } else {
        ctx.fillStyle = player.color;
    }
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Game Over text
    if (game.state === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        const minutes = Math.floor(game.survivalTime / 60);
        const seconds = Math.floor(game.survivalTime % 60);
        const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        ctx.fillText('Survived: ' + timeStr + '  |  Kills: ' + game.killCount, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#888888';
        ctx.fillText('Click to restart', canvas.width / 2, canvas.height / 2 + 60);
    }

    // Draw Level Up text
    if (game.state === 'PAUSED_LEVELUP') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP!', canvas.width / 2, canvas.height / 2 - 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px sans-serif';
        ctx.fillText('Level ' + player.level, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('Click to continue (powerups coming soon)', canvas.width / 2, canvas.height / 2 + 20);
    }

    // HUD
    renderHUD();
}

// --------------- HUD ---------------
function renderHUD() {
    ctx.save();

    // Health bar (top-left)
    const hbX = 20;
    const hbY = 20;
    const hbWidth = 200;
    const hbHeight = 20;
    const hpRatio = player.hp / player.maxHp;

    ctx.fillStyle = '#661111';
    ctx.fillRect(hbX, hbY, hbWidth, hbHeight);
    ctx.fillStyle = '#44cc44';
    ctx.fillRect(hbX, hbY, hbWidth * hpRatio, hbHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(hbX, hbY, hbWidth, hbHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(player.hp) + ' / ' + player.maxHp, hbX + hbWidth / 2, hbY + 15);

    // Timer (top-center)
    const minutes = Math.floor(game.survivalTime / 60);
    const seconds = Math.floor(game.survivalTime % 60);
    const timeStr = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, canvas.width / 2, 38);

    // XP bar (bottom-center)
    const xpBarWidth = 300;
    const xpBarHeight = 16;
    const xpBarX = (canvas.width - xpBarWidth) / 2;
    const xpBarY = canvas.height - 40;
    const xpThreshold = getXpThreshold(player.level);
    const xpRatio = Math.min(player.xp / xpThreshold, 1);

    ctx.fillStyle = '#333333';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(xpBarX, xpBarY, xpBarWidth * xpRatio, xpBarHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(xpBarX, xpBarY, xpBarWidth, xpBarHeight);

    // Level label
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level ' + player.level, canvas.width / 2, xpBarY - 6);

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
