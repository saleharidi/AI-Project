class Particle {
    constructor(px, py, color) {
        this.x = px;
        this.y = py;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 6;
        this.speedY = (Math.random() - 0.5) * 6;
        this.life = 1.0;
        this.color = color;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.03;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class NeonSnakeEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.accumulator = 0;
        this.lastTime = 0;
        this.baseTickRate = 115;
        this.tickRate = this.baseTickRate;
        this.trauma = 0;
        this.shield = false;
        this.shieldTimer = 0;
        this.shieldDuration = 7000; // ms
        this.shieldWarningTime = 2000; // ms before expiry

        // clickup AI
        // NEW: obstacle system
        this.obstacles = [];          // array of {x, y}
        this.maxObstacles = 0;        // will scale with score
        this.obstacleMinDistance = 4; // how far from snake head spawn


        this.setupCanvas();
        this.reset();
        this.bindEvents();
        requestAnimationFrame((t) => this.loop(t));
    }

    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const maxWidth = window.innerWidth * 0.95;
        const maxHeight = window.innerHeight * 0.85;
        const width = Math.min(800, maxWidth);
        const height = (width * 3) / 4;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.grid = { x: 40, y: 30 };
        this.cellSize = width / this.grid.x;
    }

    reset() {
        this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.food = this.spawnFood();
        this.particles = [];
        this.score = 0;
        this.gameState = 'MENU';
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
        this.shield = false;
        this.tickRate = this.baseTickRate;

        // Clickup AI
        // NEW: reset obstacles
        this.obstacles = [];
        this.maxObstacles = 0;

        document.getElementById('high-score').innerText = this.highScore;
        document.getElementById('current-score').innerText = '0';
    }

    spawnFood() {

        let newFood;
        let isInvalid = true;

        // Decide food type (rare special foods)
        const roll = Math.random();
        let type = 'apple';
        if (roll < 0.09) type = 'bomb';
        else if (roll < 0.17) type = 'lightning'; 
        else if (roll < 0.20) type = 'shield'; 
        else if (roll < 0.30) type = 'grape';  


        while (isInvalid) {
            newFood = {
                x: Math.floor(Math.random() * this.grid.x),
                y: Math.floor(Math.random() * this.grid.y),
                type
            };
            isInvalid = this.snake.some(s => s.x === newFood.x && s.y === newFood.y);
        }
        if (type === 'bomb') {
            newFood.spawnTime = performance.now();        // when it spawned
            newFood.explodeAfter = 5000;                  // 5 seconds until it explodes
        }

        return newFood;


    }

    // Increase difficulty based on score
    updateDifficulty() {
        // Every 50 points, increase max obstacles by 1, up to 15
        const level = Math.floor(this.score / 50);
        this.maxObstacles = Math.min(3 + level, 15);
    }

    // Check if a cell is occupied by the snake or food or another obstacle
    isCellBlocked(x, y) {
        // snake
        if (this.snake.some(s => s.x === x && s.y === y)) return true;

        // food
        if (this.food && this.food.x === x && this.food.y === y) return true;

        // obstacles
        if (this.obstacles.some(o => o.x === x && o.y === y)) return true;

        return false;
    }

    // Distance from snake head (Manhattan distance)
    headDistance(x, y) {
        const head = this.snake[0];
        return Math.abs(head.x - x) + Math.abs(head.y - y);
    }

    // Try to spawn one new obstacle in a safe random spot
    spawnSingleObstacle() {
        let attempts = 0;
        while (attempts < 50) {
            const x = Math.floor(Math.random() * this.grid.x);
            const y = Math.floor(Math.random() * this.grid.y);

            if (this.isCellBlocked(x, y)) {
                attempts++;
                continue;
            }

            // Don’t spawn too close to the snake head
            if (this.headDistance(x, y) < this.obstacleMinDistance) {
                attempts++;
                continue;
            }

            this.obstacles.push({ x, y });
            return;
        }
    }

    // Clickup AI
    // Increase difficulty based on score
    updateDifficulty() {
        // Every 50 points, increase max obstacles by 1, up to 15
        const level = Math.floor(this.score / 50);
        this.maxObstacles = Math.min(3 + level, 15);
    }

    // Check if a cell is occupied by the snake or food or another obstacle
    isCellBlocked(x, y) {
        // snake
        if (this.snake.some(s => s.x === x && s.y === y)) return true;

        // food
        if (this.food && this.food.x === x && this.food.y === y) return true;

        // obstacles
        if (this.obstacles.some(o => o.x === x && o.y === y)) return true;

        return false;
    }

    // Distance from snake head (Manhattan distance)
    headDistance(x, y) {
        const head = this.snake[0];
        return Math.abs(head.x - x) + Math.abs(head.y - y);
    }

    // Try to spawn one new obstacle in a safe random spot
    spawnSingleObstacle() {
        let attempts = 0;
        while (attempts < 50) {
            const x = Math.floor(Math.random() * this.grid.x);
            const y = Math.floor(Math.random() * this.grid.y);

            if (this.isCellBlocked(x, y)) {
                attempts++;
                continue;
            }

            // Don’t spawn too close to the snake head
            if (this.headDistance(x, y) < this.obstacleMinDistance) {
                attempts++;
                continue;
            }

            this.obstacles.push({ x, y });
            return;
        }
    }

    // Keep obstacle count in sync with difficulty
    updateObstacles() {
        // Add obstacles until we reach maxObstacles
        while (this.obstacles.length < this.maxObstacles) {
            this.spawnSingleObstacle();
        }

        // OPTIONAL: you can also remove extra obstacles if maxObstacles drops
        if (this.obstacles.length > this.maxObstacles) {
            this.obstacles.length = this.maxObstacles;
        }
    }

    loop(timestamp) {
        let dt = timestamp - this.lastTime;
        if (dt > 100) dt = 100;
        this.lastTime = timestamp;

        if (this.gameState === 'PLAYING') {
            this.accumulator += dt;

            if (this.accumulator >= this.tickRate) {
                this.updatePhysics();
                this.accumulator -= this.tickRate;

                // IMPORTANT: prevent multiple updates in a single frame
                if (this.accumulator > this.tickRate) {
                    this.accumulator = 0; // discard extra time so we never “catch up” with double moves
                }
            }
        }

        // Shield expiration check
        if (this.shield && timestamp >= this.shieldTimer) {
            this.shield = false;
        }


        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    updatePhysics() {
        this.dir = this.nextDir;
        const head = {
            x: this.snake[0].x + this.dir.x,
            y: this.snake[0].y + this.dir.y
        };

        const hitWall =
            head.x < 0 ||
            head.x >= this.grid.x ||
            head.y < 0 ||
            head.y >= this.grid.y;

        const hitSelf = this.snake.some(s => s.x === head.x && s.y === head.y);

        // Clickup AI
        // NEW: obstacle collision
        const hitObstacle = this.obstacles.some(o => o.x === head.x && o.y === head.y);
        // Check if bomb exploded on the grid
        // Check if bomb should disappear
        if (this.food.type === 'bomb') {
            const now = performance.now();
            if (now - this.food.spawnTime >= this.food.explodeAfter) {
                // Bomb just disappears
                this.food = this.spawnFood(); // spawn new food
            }
        }


        // chatgpt code edited by Clickup
        if (hitWall || hitSelf || hitObstacle) {
            if (this.shield) {
                // Shield crash → explode + revive
                this.createExplosion(
                    this.snake[0].x * this.cellSize + this.cellSize / 2,
                    this.snake[0].y * this.cellSize + this.cellSize / 2,
                    '#00fff0'
                );
                this.triggerShake(0.9);

                this.shield = false;

                // Reset snake but keep score
                this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
                this.dir = { x: 1, y: 0 };
                this.nextDir = { x: 1, y: 0 };
                this.food = this.spawnFood();
                return;
            } else {
                this.triggerShake(0.8);
                this.createExplosion(
                    this.snake[0].x * this.cellSize + this.cellSize / 2,
                    this.snake[0].y * this.cellSize + this.cellSize / 2,
                    '#ff007f'
                );
                this.gameOver();
                return;
            }
        }


        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.handleFoodEffect(this.food.type);
            this.food = this.spawnFood();
        } else {
            this.snake.pop();
        }

        this.particles = this.particles.filter(p => {
            p.update();
            return p.life > 0;
        });

        if (this.trauma > 0) this.trauma -= 0.05;
    }



    handleFoodEffect(type) {
        switch (type) {
            case 'lightning':
                this.score += 25;
                this.tickRate = Math.max(30, this.tickRate - 40); // MUCH faster
                this.triggerShake(0.5);
                setTimeout(() => this.tickRate = this.baseTickRate, 5000);
                this.createExplosion(
                    this.food.x * this.cellSize + this.cellSize / 2,
                    this.food.y * this.cellSize + this.cellSize / 2,
                    '#f7ff00'
                );
                break;

            case 'shield':
                this.score += 20;
                this.shield = true;
                this.shieldTimer = performance.now() + this.shieldDuration;
                this.triggerShake(0.4);
                this.createExplosion(
                    this.food.x * this.cellSize + this.cellSize / 2,
                    this.food.y * this.cellSize + this.cellSize / 2,
                    '#00fff0'
                );
                break;


            case 'grape':
                this.score += 18;
                this.tickRate = Math.min(200, this.tickRate + 70); // MUCH slower
                this.triggerShake(0.4);
                setTimeout(() => this.tickRate = this.baseTickRate, 5000);
                this.createExplosion(
                    this.food.x * this.cellSize + this.cellSize / 2,
                    this.food.y * this.cellSize + this.cellSize / 2,
                    '#b84cff'
                );
                break;

            case 'bomb':
                if (this.shield) {
                    // Shield saves player: explode + revive
                    this.createExplosion(
                        this.food.x * this.cellSize + this.cellSize / 2,
                        this.food.y * this.cellSize + this.cellSize / 2,
                        '#ff5500'
                    );
                    this.triggerShake(0.9);
                    this.shield = false;

                    // Reset snake like normal shield revive
                    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
                    this.dir = { x: 1, y: 0 };
                    this.nextDir = { x: 1, y: 0 };
                    this.food = this.spawnFood();
                } else {
                    // No shield → game over instantly
                    this.createExplosion(
                        this.food.x * this.cellSize + this.cellSize / 2,
                        this.food.y * this.cellSize + this.cellSize / 2,
                        '#ff5500'
                    );
                    this.triggerShake(1.0);
                    this.gameOver();
                }
                break;


            default: // apple
                this.score += 10;
                this.triggerShake(0.3);
                this.createExplosion(
                    this.food.x * this.cellSize + this.cellSize / 2,
                    this.food.y * this.cellSize + this.cellSize / 2,
                    '#ff003c'
                );
        }

        document.getElementById('current-score').innerText = this.score;

        // Click up
        // NEW: update difficulty and obstacles when score changes
        this.updateDifficulty();
        this.updateObstacles();
    }

    triggerShake(amount) {
        this.trauma = Math.min(this.trauma + amount, 1.0);
    }

    render() {
        this.ctx.save();

        if (this.trauma > 0) {
            const shake = Math.pow(this.trauma, 2) * 15;
            this.ctx.translate(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
        }

        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // === DRAW SNAKE ===
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.cellSize + this.cellSize / 2;
            const y = segment.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 0.45;

            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#00f2ff';

            const grad = this.ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
            grad.addColorStop(0, '#a8ffff');
            grad.addColorStop(1, '#00b3cc');
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();

            if (index === 0) {
                this.ctx.shadowBlur = 0;
                this.ctx.fillStyle = '#000';
                const eyeOffset = radius * 0.35;
                const eyeRadius = radius * 0.12;

                this.ctx.beginPath();
                this.ctx.arc(x - eyeOffset, y - eyeOffset, eyeRadius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(x + eyeOffset, y - eyeOffset, eyeRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // clickup
        // === DRAW OBSTACLES ===
        this.ctx.shadowBlur = 35;
        this.ctx.shadowColor = '#00f2ff';

        this.obstacles.forEach(ob => {
            const x = ob.x * this.cellSize + this.cellSize / 2;
            const y = ob.y * this.cellSize + this.cellSize / 2;

            // Thicker, more obvious fence
            const width = this.cellSize * 0.95;   // almost full cell width
            const height = this.cellSize * 0.35;  // thicker bar

            const left = x - width / 2;
            const top = y - height / 2;

            // Stronger flicker
            const t = performance.now() / 1000;
            const flicker = 0.8 + 0.2 * Math.sin(t * 12 + x + y);

            // Bright core gradient
            const grad = this.ctx.createLinearGradient(left, y, left + width, y);
            grad.addColorStop(0.0, `rgba(0, 242, 255, ${0.35 * flicker})`);
            grad.addColorStop(0.25, `rgba(0, 242, 255, ${0.7 * flicker})`);
            grad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * flicker})`);
            grad.addColorStop(0.75, `rgba(0, 242, 255, ${0.7 * flicker})`);
            grad.addColorStop(1.0, `rgba(0, 242, 255, ${0.35 * flicker})`);

            // Outer glow / aura (much stronger)
            this.ctx.fillStyle = `rgba(0, 242, 255, ${0.35 * flicker})`;
            this.ctx.fillRect(left - 4, top - 8, width + 8, height + 16);

            // Core laser bar
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(left, top, width, height);

            // Sharp outline to make it read against dark background
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = `rgba(0, 250, 255, ${0.9 * flicker})`;
            this.ctx.strokeRect(left, top, width, height);
        });

        // === DRAW SHIELD BUBBLE ===
        if (this.shield) {
            const head = this.snake[0];
            const x = head.x * this.cellSize + this.cellSize / 2;
            const y = head.y * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize * 1.1;

            const now = performance.now();
            const timeLeft = this.shieldTimer - now;
            const flicker = timeLeft < this.shieldWarningTime && Math.floor(now / 150) % 2 === 0;

            if (!flicker) {
                this.ctx.save();
                this.ctx.shadowBlur = 25;
                this.ctx.shadowColor = '#00fff0';
                this.ctx.strokeStyle = 'rgba(0, 255, 240, 0.6)';
                this.ctx.lineWidth = 4;

                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.restore();
            }
        }

        // === DRAW FOOD ===
        const fx = this.food.x * this.cellSize + this.cellSize / 2;
        const fy = this.food.y * this.cellSize + this.cellSize / 2;
        const fr = this.cellSize * 0.45;

        this.ctx.shadowBlur = 18;

        if (this.food.type === 'lightning') {
            this.ctx.shadowColor = '#f7ff00';
            this.ctx.fillStyle = '#f7ff00';
            this.ctx.beginPath();
            this.ctx.moveTo(fx - fr * 0.3, fy - fr);
            this.ctx.lineTo(fx + fr * 0.2, fy - fr * 0.1);
            this.ctx.lineTo(fx, fy);
            this.ctx.lineTo(fx + fr * 0.3, fy + fr);
            this.ctx.lineTo(fx - fr * 0.2, fy + fr * 0.1);
            this.ctx.lineTo(fx, fy);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (this.food.type === 'shield') {
            this.ctx.shadowColor = '#00fff0';
            this.ctx.fillStyle = '#00fff0';
            this.ctx.beginPath();
            this.ctx.arc(fx, fy, fr * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } else if (this.food.type === 'grape') {
            this.ctx.shadowColor = '#b84cff';
            this.ctx.fillStyle = '#b84cff';

            const r = fr * 0.35;
            const positions = [
                { x: fx, y: fy - r },
                { x: fx - r, y: fy },
                { x: fx + r, y: fy },
                { x: fx, y: fy + r },
                { x: fx - r / 1.5, y: fy + r * 1.8 },
                { x: fx + r / 1.5, y: fy + r * 1.8 }
            ];

            positions.forEach(p => {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                this.ctx.fill();
            });

            // Stem
            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = '#5b3a29';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(fx, fy - fr * 1.3);
            this.ctx.lineTo(fx, fy - fr * 0.7);
            this.ctx.stroke();
        } else if (this.food.type === 'bomb') {
            const fx = this.food.x * this.cellSize + this.cellSize / 2;
            const fy = this.food.y * this.cellSize + this.cellSize / 2;
            const fr = this.cellSize * 0.4;

            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff5500';

            // Bomb body
            this.ctx.fillStyle = '#333';
            this.ctx.beginPath();
            this.ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            this.ctx.fill();

            // Fuse
            this.ctx.strokeStyle = '#ffbb33';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(fx, fy - fr);
            this.ctx.lineTo(fx, fy - fr * 1.5);
            this.ctx.stroke();

            // Spark at fuse tip
            this.ctx.fillStyle = '#ffbb33';
            this.ctx.beginPath();
            this.ctx.arc(fx, fy - fr * 1.5, fr * 0.2, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Apple
            this.ctx.shadowColor = '#ff007f';
            const appleGrad = this.ctx.createRadialGradient(
                fx - fr * 0.3,
                fy - fr * 0.3,
                fr * 0.2,
                fx,
                fy,
                fr
            );
            appleGrad.addColorStop(0, '#ffb3c7');
            appleGrad.addColorStop(1, '#ff003c');
            this.ctx.fillStyle = appleGrad;
            this.ctx.beginPath();
            this.ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            this.ctx.strokeStyle = '#5b3a29';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(fx, fy - fr * 0.6);
            this.ctx.lineTo(fx, fy - fr * 1.1);
            this.ctx.stroke();

            this.ctx.fillStyle = '#2ecc71';
            this.ctx.beginPath();
            this.ctx.ellipse(
                fx + fr * 0.5,
                fy - fr * 0.9,
                fr * 0.35,
                fr * 0.2,
                -0.5,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }

        if (this.food.type === 'bomb') {
            const fx = this.food.x * this.cellSize + this.cellSize / 2;
            const fy = this.food.y * this.cellSize + this.cellSize / 2;
            const fr = this.cellSize * 0.4;

            const now = performance.now();
            const timeLeft = this.food.explodeAfter - (now - this.food.spawnTime);

            // Flicker if less than 2 seconds left
            if (timeLeft < 2000) {
                const alpha = Math.sin(now / 100 * Math.PI) * 0.5 + 0.5; // flicker between 0.0-1.0
                this.ctx.fillStyle = `rgba(255,85,0,${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(fx, fy, fr * 0.6, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Bomb body (always drawn)
            this.ctx.fillStyle = '#333';
            this.ctx.beginPath();
            this.ctx.arc(fx, fy, fr, 0, Math.PI * 2);
            this.ctx.fill();
        }



        // === DRAW PARTICLES ===
        this.particles.forEach(p => p.draw(this.ctx));

        this.ctx.restore();
    }

    createExplosion(px, py, color) {
        for (let i = 0; i < 30; i++) {
            this.particles.push(new Particle(px, py, color));
        }
    }

    gameOver() {
        if (this.score > this.highScore) {
            localStorage.setItem('snakeHighScore', this.score);
        }
        this.gameState = 'GAMEOVER';
        document.getElementById('ui-overlay').style.opacity = '1';
        document.getElementById('ui-overlay').style.pointerEvents = 'auto';
        document.getElementById('start-btn').innerText = 'REBOOT ENGINE';
    }

    bindEvents() {
        document.getElementById('start-btn').onclick = () => {
            this.reset();
            this.gameState = 'PLAYING';
            document.getElementById('ui-overlay').style.opacity = '0';
            document.getElementById('ui-overlay').style.pointerEvents = 'none';
        };

        window.onkeydown = (e) => {
            const keys = {
                ArrowUp: { x: 0, y: -1 },
                ArrowDown: { x: 0, y: 1 },
                ArrowLeft: { x: -1, y: 0 },
                ArrowRight: { x: 1, y: 0 }
            };
            if (keys[e.key]) {
                const move = keys[e.key];
                if (move.x !== -this.dir.x || move.y !== -this.dir.y) {
                    this.nextDir = move;
                }
                e.preventDefault();
            }
        };

        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            document.onmousemove = (e) => {
                cursor.style.left = e.clientX + "px";
                cursor.style.top = e.clientY + "px";
            };
        }

        window.addEventListener('resize', () => this.setupCanvas());
    }
}

new NeonSnakeEngine();
