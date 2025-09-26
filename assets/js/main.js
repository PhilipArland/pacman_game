window.addEventListener('DOMContentLoaded', () => {
    const CELL_SIZE = 25;
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Sounds
    const introSound = new Audio('assets/sounds/intro.wav');
    const chompSound = new Audio('assets/sounds/chomp.wav');
    const powerSound = new Audio('assets/sounds/power.wav');
    const deathSound = new Audio('assets/sounds/death.wav');

    // Buttons / Modals
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const confirmYes = document.getElementById('confirmYes');
    const confirmCancel = document.getElementById('confirmCancel');

    const gameModal = new bootstrap.Modal(document.getElementById('gameModal'));
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    // Maze: 0 = dot, 1 = wall, 2 = power pellet, 3 = empty (eaten)
    const originalMaze = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 2, 1],
        [1, 0, 1, 0, 1, 1, 0, 0, 0, 2, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 3, 3, 3, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1],
        [3, 0, 1, 1, 1, 0, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 0, 1, 1, 1, 0, 3],
        [1, 0, 0, 0, 1, 0, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 0, 1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 2, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 2, 0, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    let maze = JSON.parse(JSON.stringify(originalMaze));
    const rows = maze.length;
    const cols = maze[0].length;

    // Entities
    const pacman = { row: 1, col: 1, direction: 'right', nextDirection: 'right', mouthAngle: 0, mouthDir: 1 };

    const initialGhosts = () => ([
        { row: 5, col: 12, color: 'red', direction: 'left', mode: 'scatter' },
        { row: 5, col: 14, color: 'pink', direction: 'right', mode: 'scatter' },
        { row: 6, col: 12, color: 'cyan', direction: 'up', mode: 'scatter' },
        { row: 6, col: 14, color: 'orange', direction: 'down', mode: 'scatter' }
    ]);

    let ghosts = initialGhosts();
    let ghostIdleOffsets = ghosts.map(() => ({ x: 0, y: 0 }));

    // Game state
    let frameCount = 0;
    const moveSpeed = 10;
    let powerMode = false;
    let powerModeTimer = 0;
    let gameRunning = false;
    let countdown = -1; // 👈 READY state
    let lives = 3;
    let score = 0;

    // Pause state (life lost)
    let pauseState = null;      // 'lifeLost' or 'gameOver'
    let pauseCountdown = 3;
    let pauseTimer = 60;

    // Reset everything
    function resetGame() {
        pacman.row = 1; pacman.col = 1; pacman.direction = 'right'; pacman.nextDirection = 'right';
        ghosts = initialGhosts();
        ghostIdleOffsets = ghosts.map(() => ({ x: 0, y: 0 }));
        maze = JSON.parse(JSON.stringify(originalMaze));
        lives = 3;
        score = 0;
        powerMode = false;
        powerModeTimer = 0;
        gameRunning = false;
        countdown = -1; // 👈 READY until Start clicked
        pauseState = null;
        pauseCountdown = 3;
        pauseTimer = 60;
        updateScore();
        updateLives();
    }

    function updateScore() { document.getElementById('score').innerText = score; }
    function updateLives() { document.getElementById('lives').innerText = lives; }

    function showModal(title, message) {
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = message;
        gameModal.show();
    }

    // Controls
    window.addEventListener('keydown', e => {
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': pacman.nextDirection = 'up'; break;
            case 'ArrowDown': case 's': case 'S': pacman.nextDirection = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A': pacman.nextDirection = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': pacman.nextDirection = 'right'; break;
        }
    });

    // Resize canvas
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Start button
    startBtn.addEventListener('click', () => {
        if (!gameRunning && countdown === -1) {
            introSound.currentTime = 0;
            introSound.play();
            countdown = 3;
            frameCount = 0;
            startBtn.disabled = true;
            startBtn.innerText = 'Get Ready...';
        } else if (gameRunning) {
            gameRunning = false;
            confirmModal.show();
        }
    });

    // Restart button in modal
    restartBtn.addEventListener('click', () => {
        resetGame();
        gameModal.hide();
    });

    confirmYes.addEventListener('click', () => {
        resetGame();
        startBtn.innerText = "Start Game";
        confirmModal.hide();
    });

    confirmCancel.addEventListener('click', () => {
        gameRunning = true;
        confirmModal.hide();
    });

    // Utility movement/collision/drawing functions (same as before)
    function canMove(r, c) { return maze[r] && maze[r][c] !== 1; }

    function movePacman() {
        let nr = pacman.row, nc = pacman.col;
        switch (pacman.nextDirection) {
            case 'up': if (canMove(nr - 1, nc)) { nr--; pacman.direction = 'up'; } break;
            case 'down': if (canMove(nr + 1, nc)) { nr++; pacman.direction = 'down'; } break;
            case 'left':
                if (nc - 1 < 0) {
                    // wrap around to right side
                    nc = cols - 1;
                } else if (canMove(nr, nc - 1)) {
                    nc--;
                    pacman.direction = 'left';
                }
                break;
            case 'right':
                if (nc + 1 >= cols) {
                    // wrap around to left side
                    nc = 0;
                } else if (canMove(nr, nc + 1)) {
                    nc++;
                    pacman.direction = 'right';
                }
                break;
        }
        pacman.row = nr;
        pacman.col = nc;

        const cell = maze[nr][nc];
        if (cell === 0) {
            maze[nr][nc] = 3;
            score += 10;
            chompSound.currentTime = 0;
            chompSound.play();
        }
        if (cell === 2) {
            maze[nr][nc] = 3;
            powerMode = true;
            powerModeTimer = 300;
            score += 50;
            powerSound.currentTime = 0;
            powerSound.play();
        }
    }


    function moveGhosts() {
        if (!gameRunning) return;
        ghosts.forEach(g => {
            if (g.row === -1 && g.col === -1) return; // skip eaten

            const moves = [];
            if (canMove(g.row - 1, g.col) && g.direction !== 'down') moves.push('up');
            if (canMove(g.row + 1, g.col) && g.direction !== 'up') moves.push('down');
            if (canMove(g.row, g.col - 1) && g.direction !== 'right') moves.push('left');
            if (canMove(g.row, g.col + 1) && g.direction !== 'left') moves.push('right');

            if (moves.length === 0) return;

            let chosenDir = moves[Math.floor(Math.random() * moves.length)];
            let bestScore = powerMode ? -Infinity : Infinity;

            moves.forEach(dir => {
                let r = g.row, c = g.col;
                if (dir === 'up') r--;
                if (dir === 'down') r++;
                if (dir === 'left') c--;
                if (dir === 'right') c++;
                const dist = Math.abs(r - pacman.row) + Math.abs(c - pacman.col);
                if (!powerMode) {
                    if (dist < bestScore) { bestScore = dist; chosenDir = dir; }
                } else {
                    if (dist > bestScore) { bestScore = dist; chosenDir = dir; }
                }
            });

            g.direction = chosenDir;
            switch (g.direction) {
                case 'up': g.row--; break;
                case 'down': g.row++; break;
                case 'left': g.col--; break;
                case 'right': g.col++; break;
            }
        });
    }

    function checkGhostCollisions() {
        if (!gameRunning && pauseState === 'lifeLost') return;
        for (let g of ghosts) {
            if (g.row === -1 && g.col === -1) continue;
            if (g.row === pacman.row && g.col === pacman.col) {
                if (powerMode) {
                    g.row = -1; g.col = -1; score += 200;
                } else {
                    lives = Math.max(0, lives - 1);
                    updateLives();
                    deathSound.currentTime = 0; deathSound.play();
                    gameRunning = false;
                    pauseState = 'lifeLost';
                    pauseCountdown = 3;
                    pauseTimer = 60;
                    pacman.row = 1; pacman.col = 1;
                    const start = initialGhosts();
                    ghosts = ghosts.map((ghost, idx) => ghost.row === -1 ? ghost : { ...start[idx] });
                    if (lives === 0) {
                        pauseState = 'gameOver';
                        showModal("Game Over", "You ran out of lives!");
                    }
                    break;
                }
            }
        }
    }

    function allDotsEaten() {
        return maze.flat().every(c => c !== 0 && c !== 2);
    }

    function updatePacmanMouth() {
        pacman.mouthAngle += pacman.mouthDir * 0.05;
        if (pacman.mouthAngle > Math.PI * 0.2) pacman.mouthDir = -1;
        if (pacman.mouthAngle < 0) pacman.mouthDir = 1;
    }

    function drawMaze(cellSizeX, cellSizeY) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = maze[r][c];
                ctx.fillStyle = '#000';
                ctx.fillRect(c * cellSizeX, r * cellSizeY, cellSizeX, cellSizeY);

                if (cell === 1) {
                    ctx.fillStyle = '#0000ff';
                    ctx.fillRect(c * cellSizeX, r * cellSizeY, cellSizeX, cellSizeY);
                }
                else if (cell === 0 || cell === 2) {
                    ctx.fillStyle = '#ffc107';
                    ctx.beginPath();

                    if (cell === 0) {
                        // normal small dot
                        const radius = Math.min(cellSizeX, cellSizeY) / 6;
                        ctx.arc(
                            c * cellSizeX + cellSizeX / 2,
                            r * cellSizeY + cellSizeY / 2,
                            radius,
                            0,
                            Math.PI * 2
                        );
                    } else if (cell === 2) {
                        // pulsing animation for power pellet
                        const baseRadius = Math.min(cellSizeX, cellSizeY) / 3;
                        const pulse = Math.sin(frameCount * 0.1) * 1; // oscillate between -2 and +2
                        const radius = baseRadius + pulse;
                        ctx.arc(
                            c * cellSizeX + cellSizeX / 2,
                            r * cellSizeY + cellSizeY / 2,
                            radius,
                            0,
                            Math.PI * 2
                        );
                    }

                    ctx.fill();
                }
            }
        }
    }


    function drawPacman(cellSizeX, cellSizeY) {
        const cx = pacman.col * cellSizeX + cellSizeX / 2;
        const cy = pacman.row * cellSizeY + cellSizeY / 2;
        const r = Math.min(cellSizeX, cellSizeY) / 2 * 0.9;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        let start, end;
        switch (pacman.direction) {
            case 'right': start = pacman.mouthAngle; end = 2 * Math.PI - pacman.mouthAngle; break;
            case 'left': start = Math.PI + pacman.mouthAngle; end = Math.PI - pacman.mouthAngle; break;
            case 'up': start = 1.5 * Math.PI + pacman.mouthAngle; end = 1.5 * Math.PI - pacman.mouthAngle; break;
            case 'down': start = 0.5 * Math.PI + pacman.mouthAngle; end = 0.5 * Math.PI - pacman.mouthAngle; break;
        }
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end, false);
        ctx.closePath();
        ctx.fill();
    }

    function drawGhosts(cellSizeX, cellSizeY) {
        ghosts.forEach((g, i) => {
            let offsetX = 0, offsetY = 0;
            if (!gameRunning || countdown > 0) {
                offsetX = Math.sin(frameCount * 0.05 + i) * 3;
                offsetY = Math.cos(frameCount * 0.05 + i) * 2;
                ghostIdleOffsets[i] = { x: offsetX, y: offsetY };
            } else {
                offsetX = ghostIdleOffsets[i].x;
                offsetY = ghostIdleOffsets[i].y;
            }
            const x = g.col * cellSizeX + cellSizeX / 2 + offsetX;
            const y = g.row * cellSizeY + cellSizeY / 2 + offsetY;
            ctx.fillStyle = powerMode ? '#0000ff' : g.color;
            ctx.beginPath();
            ctx.arc(x, y - 2, CELL_SIZE / 2 - 2, Math.PI, 0);
            ctx.fillRect(x - CELL_SIZE / 2 + 2, y - 2, CELL_SIZE - 4, CELL_SIZE / 2);
            const toothWidth = (CELL_SIZE - 4) / 4;
            for (let t = 0; t < 4; t++) {
                if (t % 2 === 0) ctx.fillRect(x - CELL_SIZE / 2 + 2 + t * toothWidth, y + CELL_SIZE / 2 - 4, toothWidth, 4);
            }
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 6, y - 8, 4, 4);
            ctx.fillRect(x + 2, y - 8, 4, 4);
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 5, y - 7, 2, 2);
            ctx.fillRect(x + 3, y - 7, 2, 2);
        });
    }

    // Main loop
    function gameLoop() {
        const cellSizeX = canvas.width / cols;
        const cellSizeY = canvas.height / rows;
        frameCount++;

        // READY / Countdown before start
        if (countdown !== 0) {
            drawMaze(cellSizeX, cellSizeY);
            drawPacman(cellSizeX, cellSizeY);
            drawGhosts(cellSizeX, cellSizeY);

            ctx.fillStyle = '#ff0';
            ctx.font = `${cellSizeY}px 'Press Start 2P'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const offsetX = 10;  // move right
            const offsetY = 20;  // move down

            if (countdown === -1) {
                // Show READY until Start is clicked
                ctx.fillText("READY!", canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
            } else if (countdown > 0) {
                // Countdown numbers
                ctx.fillText(countdown, canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);

                if (frameCount % 60 === 0) {
                    countdown--;
                    if (countdown === 0) {
                        gameRunning = true;
                        startBtn.disabled = false;
                        startBtn.innerText = "Restart Game";
                    }
                }
            }

            requestAnimationFrame(gameLoop);
            return;
        }

        // Pause handling
        if (!gameRunning && (pauseState === 'lifeLost' || pauseState === 'gameOver')) {
            drawMaze(cellSizeX, cellSizeY);
            drawPacman(cellSizeX, cellSizeY);
            drawGhosts(cellSizeX, cellSizeY);
            if (pauseState === 'gameOver') {
                requestAnimationFrame(gameLoop);
                return;
            }
            if (pauseTimer > 0) {
                pauseTimer--;
            } else {
                pauseCountdown--;
                if (pauseCountdown <= 0) {
                    gameRunning = true;
                    pauseState = null;
                    pauseCountdown = 3;
                } else {
                    pauseTimer = 60;
                }
            }
            ctx.fillStyle = '#ff0';
            ctx.font = `${cellSizeY}px 'Press Start 2P'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pauseCountdown, canvas.width / 2, canvas.height / 2);
            requestAnimationFrame(gameLoop);
            return;
        }

        // Normal game update
        updatePacmanMouth();
        if (gameRunning && frameCount % moveSpeed === 0) {
            movePacman();
            moveGhosts();
            checkGhostCollisions();
        }
        if (powerMode) {
            powerModeTimer--;
            if (powerModeTimer <= 0) powerMode = false;
        }
        drawMaze(cellSizeX, cellSizeY);
        drawPacman(cellSizeX, cellSizeY);
        drawGhosts(cellSizeX, cellSizeY);
        updateScore();
        updateLives();
        if (allDotsEaten() && gameRunning) {
            gameRunning = false;
            powerSound.pause();
            introSound.play();
            showModal("Congratulations!", "You cleared all dots!");
        }
        requestAnimationFrame(gameLoop);
    }

    // Start loop
    resetGame();
    gameLoop();
});
