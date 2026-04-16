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
    hp: 100,
    maxHp: 100,
    invincibleUntil: 0,
};

const enemies = [];
const projectiles = [];
const xpGems = [];

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

    // Player movement
    if (player.moving) {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
        } else {
            const moveX = (dx / dist) * player.speed * dt;
            const moveY = (dy / dist) * player.speed * dt;

            // Don't overshoot
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

        // Clamp to world bounds
        player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));
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

    // Draw player
    const sp = worldToScreen(player.x, player.y);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
}

// --------------- Game Loop ---------------
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - game.lastTime) / 1000, 0.1); // cap delta at 100ms
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
