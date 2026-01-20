/**
 * @file src/os/apps/snake.js
 * @description Motor de juego Snake completo con Canvas, Game Loop y Persistencia.
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';

export class SnakeGame {
    constructor() {
        // Configuracion
        this.TILE_SIZE = 20;
        this.COLS = 20;
        this.ROWS = 20;
        this.WIDTH = this.TILE_SIZE * this.COLS;
        this.HEIGHT = this.TILE_SIZE * this.ROWS;

        // Estado
        this.canvas = null;
        this.ctx = null;
        this.scoreElement = null;
        this.highScoreElement = null;
        this.overlay = null;

        this.snake = [];
        this.food = { x: 0, y: 0};
        this.direction = { x: 0, y: 0};
        this.nextDirection = { x: 0, y: 0}; // Buffer para evitar giros suicidas

        this.score = 0;
        this.highScore = 0;
        this.speed = 150; //ms entre frames
        this.lastRenderTime = 0;
        this.gameLoopId = null;
        this.isGameOver = false;
        this.isPaused = false;
        this.isPlaying = false;

        // --- GAME JUICE ---
        this.particles = [];
        this.shakeTime = 0;
    }

    // --- EFECTOS VISUALES ---

    createExplosion(gridX, gridY, color) {
        //Convierte coordenadas de grilla a pixeles para centrar la explosion
        const pixelX = (gridX * this.TILE_SIZE) + (this.TILE_SIZE / 2);
        const pixelY = (gridY * this.TILE_SIZE) + (this.TILE_SIZE / 2);

        // Crea 10 particulas
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: pixelX,
                y: pixelY,
                //Velocidad aleatoria en X e Y
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1.0, // Vida del 100%
                color: color
            });
        }
    }

    startShake(duration) {
        this.shakeTime = duration;
    }

    updateParticles() {
        // Recorre el array al reves para poder borrar elementos sin romper el loop
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.20; // Se desvanecen un 5% cada frame

            // Si se apago, se borra
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Metodo principal que llama el WindowManager
     */
    run() {
        // 1. Cargar High Score del disco duro
        this.loadHighScore();

        // 2. Crear Elementos DOM
        this.createDOM();

        // 3. Setup de controles
        this.bindEvents();

        // 4. Render inicial (Pantalla de titulo)
        this.showTitleScreen();

        return this.container;
    }

    createDOM() {
        // Score UI
        this.scoreElement = mk('div', { text: 'SCORE: 0' });
        this.highScoreElement = mk('div', { text: `Hi: ${this.highScore}` });

        const scoreBoard = mk('div', {
            className: 'score-board',
            children: [this.scoreElement, this.highScoreElement]
        });

        // Canvas
        this.canvas = mk('canvas', {
            attributes: { width: this.WIDTH, height: this.HEIGHT }
        });
        this.ctx = this.canvas.getContext('2d');

        // Contenedor "Consola"
        const gameContainer = mk('div', {
            className: 'game-container',
            children: [this.canvas]
        });

        // Overlay (Menu / Game Over)
        this.overlay = mk('div', { className: 'game-overlay' });

        // App Wrapper
        this.container = mk('div', {
            className: 'snake-app',
            attributes: { tabindex: '0' },
            children: [scoreBoard, gameContainer, this.overlay]
        });
    }

    bindEvents() {
        // Evento de teclado en el contenedor
        // Usa 'keydown' en el contenedor para no capturar teclas globales si no tiene foco
        this.container.addEventListener('keydown', (e) => this.handleInput(e));

        // Enfocar el juego automaticamente al hacer click
        this.container.addEventListener('click', () => this.container.focus());
    }

    /**
     * Bucle principal del juego (Game Loop)
     */
    gameLoop(currentTime) {
        // Solo se detiene el loop si es pausa
        // Si es GAME OVER, sigue dibujando para ver los efectos.
        if (this.isPaused) return;

        this.gameLoopId = requestAnimationFrame((t) => this.gameLoop(t));

        const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
        if (secondsSinceLastRender < this.speed / 1000) return;

        this.lastRenderTime = currentTime;

        // 1. Logica de juego (Solo si esta vivo)
        if (this.isPlaying && !this.isGameOver) {
            this.update();
        }

        // 2. Logica visual (Siempre corre, incluso en Game Over)
        this.updateParticles();

        // 3. Dibujar todo
        this.draw();
    }

    start() {
        // Reset variables
        this.snake = [{ x: 10, y: 10 }, { x: 10, y: 11}, { x: 10, y: 12 }]; //Cola hacia abajo
        this.direction = { x: 0, y: -1}; // Moverse arriba
        this.nextDirection = { x: 0, y: -1};
        this.score = 0;
        this.speed = 150;

        // Limpieza visual
        this.shakeTime = 0;
        this.particles = [];


        this.isGameOver = false;
        this.isPaused = false;
        this.isPlaying = true;

        this.updateScore(0);
        this.placeFood();
        this.hideOverlay();
        this.container.focus();

        // Iniciar Loop
        this.lastRenderTime = 0;
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update() {
        // 1. Actualizar direccinoes desde el buffer
        this.direction = this.nextDirection;

        // 2. Mover cabeza
        const head = { ...this.snake[0] }; //Copia de la cabeza actual
        head.x += this.direction.x;
        head.y += this.direction.y;

        // 3. Colisiones (Muerte)
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        // 4. Mover la serpiente (Añadir cabeza nueva)
        this.snake.unshift(head);

        // 5. Comer Comida
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore(this.score);

            // Explosion
            this.createExplosion(this.food.x, this.food.y, '#CC0000');

            this.placeFood()

            // Aumentar velocidad cada 50 puntos
            if (this.score % 50 === 0 && this.speed > 50) {
                this.speed -= 10;
            }
        } else{
            // Si no comio, quitar la cola (movimiento normal)
            this.snake.pop();
        }
    }

    draw() {
        // 1. Guardar el estado actual del canvas (para poder rotarlo/moverlo) 
        this.ctx.save();

        // 2. Aplicar shake
        if (this.shakeTime > 0) {
            const magnitude = 8;
            const dx = (Math.random() - 0.5) * magnitude;
            const dy = (Math.random() - 0.5) * magnitude;
            this.ctx.translate(dx, dy);
            this.shakeTime--;
        }

        // 3. Fondo
        this.ctx.fillStyle = '#9bbc0f';
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        // 4. Dibujar Comida
        this.ctx.fillStyle = '#CC0000';
        this.ctx.fillRect(
            this.food.x * this.TILE_SIZE + 2,
            this.food.y * this.TILE_SIZE + 2,
            this.TILE_SIZE - 4,
            this.TILE_SIZE - 4
        );

        // 5. Dibujar Serpiente
        this.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#000' : '#306230';
            this.ctx.fillRect(
                segment.x * this.TILE_SIZE + 1,
                segment.y * this.TILE_SIZE + 1,
                this.TILE_SIZE - 2,
                this.TILE_SIZE - 2
            );
        });

        // 6. Dibujar particulas
        this.particles.forEach(p => {
            // gloablAlpha para que se vuelvan transparentes
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 4, 4);
        });

        // Restaurar opacidad y posicion de camara
        this.ctx.globalAlpha = 1.0;
        this.ctx.restore();
    }

    handleInput(e) {
        // Prevenir scroll de flechas
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (this.isGameOver) {
            if (e.key === ' ' || e.key === 'Enter') this.start();
            return;
        }

        if (!this.isPlaying) {
            if (e.key === ' ' || e.key === 'Enter') this.start();
            return;
        }

        // Pausa
        if (e.key === 'p' || e.key === 'P') {
            this.togglePause();
            return;
        }

        // Controles de Direccion (Evitar giros de 100 grados)
        switch(e.key) {
            case 'ArrowUp':
                if (this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (this.direction.y === 0) this.nextDirection = { x: 0, y: 1};
                break;
            case 'ArrowLeft':
                if (this.direction.x === 0) this.nextDirection = { x: -1, y: 0};
                break;
            case 'ArrowRight':
                if (this.direction.x === 0) this.nextDirection = { x: 1, y: 0};
                break;
        }
    }

    placeFood() {
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 100) {
            this.food = {
                x : Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS)
            };

            // Verificar que no caiga sobre la serpiente
            valid = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
            attempts++;
        }

        // Failsafe: Si despues de 100 intentos no encuentra lugar (muy raro),
        // pone la comida en la esquina 0,0 si esta libre, o fuerza una posicion.
        if (!valid) {
            this.food = { x: 0, y: 0};
        }
    }

    checkCollision(head) {
        // 1. Paredes
        if (head.x < 0 || head.x >= this.COLS || head.y < 0 || head.y >= this.ROWS) {
            return true;
        }
        // 2. Cuerpo
        for (let i = 0; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }
        return false;
    }

    gameOver() {
        this.startShake(10);
        this.isPlaying = false;
        this.isGameOver = true;

        // Guardar HighScore
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        this.showOverlay('GAME OVER', 'Press Space to Restart');
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showOverlay('PAUSED', 'PRESS P to Resume');
            cancelAnimationFrame(this.gameLoopId); //Stop Loop
        } else{
            this.hideOverlay();
            this.lastRenderTime = 0; // Resetear timer para evitar salto
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    // --- UI HELPERS ---

    showTitleScreen() {
        // Dibujo inicial estatico
        this.ctx.fillStyle = '#9bbc0f';
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

        this.showOverlay('SNAKE 95', 'Press Space to Start');
    }

    showOverlay(title, subtitle) {
        this.overlay.innerHTML = `<h2>${title}</h2><p class="blink">${subtitle}</p>`;
        this.overlay.classList.add('visible');
    }

    hideOverlay() {
        this.overlay.classList.remove('visible');
    }

    updateScore(newScore) {
        this.scoreElement.innerText = `SCORE: ${newScore}`;
        if (newScore > this.highScore) {
            this.highScoreElement.innerText = `HI: ${newScore}`;
        }
    }

    // --- PERSISTENCIA (VFS) ---

    loadHighScore() {
        try {
            // Intenta leer el archivo
            const content = fs.read('system/snake_score.dat');
            this.highScore = parseInt(content) || 0;
        } catch (e) {
            // Si no existe el archivo, es 0
            this.highScore = 0;
        }
    }

    saveHighScore() {
        try {
            // Escribe en el sistema usando el metodo que arregle antes
            fs.write('system/snake_score.dat', this.highScore.toString());
        } catch(e) {
            console.error('Error saving high score:', e);
        }
    }
}

export const snakeGame = new SnakeGame();