/**
 * @file src/os/apps/snake.js
 * @description Motor de juego Snake completo con Canvas, Game Loop y Persistencia.
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';

// -- Sintetizador de audio retro (8-bit) ---
class SnakeAudio {
    constructor() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.enabled = true;
    }

    playTone(frequency, type, duration, slideTo = null) {
        if (!this.enabled) return;
        // Reactivar contexto si el navegador lo suspendio
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // 'square' (Gameboy), 'sawtooth' (NES), 'triangle'
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Efecto "Slide" (Glissando): El tono baja o sube mientras suena
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);   
        }

        // Volumen: Empieza en 0.05 y baja a 0.01 (Fade out corto)
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // SONIDO 1: Comer (Tipo "Coin" - Doble tono agudo)
    eat() {
        this.playTone(600, 'square', 0.1);
        setTimeout(() => this.playTone(1200, 'square', 0.2), 60);
    }

    // SONIDO 2: GAME OVER (Bajada triste)
    die() {
        this.playTone(200, 'sawtooth', 0.6, 10); //Baka de 200Hz a 10Hz
    }

    // SONIDO 3: Giro (Click suave)
    turn() {
        this.playTone(800, 'square', 0.03);
    }

    // SONIDO 4: LEVEL UP (Arpegio ascendente)
    levelUp() {
        this.playTone(400, 'square', 0.1);
        setTimeout(() => this.playTone(600, 'square', 0.1), 100);
        setTimeout(() => this.playTone(800, 'square', 0.1), 200);
        setTimeout(() => this.playTone(1200, 'square', 0.2), 300);
    }
}
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

        // --- SISTEMA DE NIVELES ---
        this.level = 1;
        this.obstacles = []; // Array de {x, y} para los muros
        this.bgColor = '#9bbc0f'; //Color inicial

        // --- CHIP DE AUDIO ---
        this.audio = new SnakeAudio();
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

    generateLevel(level){
        this.obstacles = [];
        this.level = level;

        // Define mapas segun el nivel
        switch(level) {
            case 1:
                this.bgColor = '#9bbc0f';
                break;

            case 2:
                this.bgColor = '#8bac0f'; // Un toque mas oscuro
                this.audio.levelUp();
                // Muro horizontal en el centro
                for(let x = 6; x < 14; x ++) {
                    this.obstacles.push({ x: x, y: 10 });
                }
                break;

            case 3:
                this.bgColor = '#a8b070';
                this.audio.levelUp();
                // Cuatro bloques en las esquinas
                // Bloque 1
                this.obstacles.push({x:3, y:3}, {x:4, y:3}, {x:3, y:4}, {x:4, y:4});
                // Bloque 2
                this.obstacles.push({x:16, y:3}, {x:17, y:3}, {x:16, y:4}, {x:17, y:4});
                // Bloque 3
                this.obstacles.push({x:3, y:16}, {x:4, y:16}, {x:3, y:17}, {x:4, y:17});
                // Bloque 4
                this.obstacles.push({x:16, y:16}, {x:17, y:16}, {x:16, y:17}, {x:17, y:17});
                break;
            
            default:
                // Nivel 4 en adelante: Generacion aleatoria (Caos)
                this.bgColor = '#889977';
                this.audio.levelUp();

                // Cabeza actual de referencia
                const head = this.snake[0];

                // Generar muros al azar pero con seguridad
                let count = 0;
                let attempts = 0;
                const target = 10 + level; //Cantidad de muros

                while (count < target && attempts < 200) {
                    const obs = {
                        x: Math.floor(Math.random() * this.COLS),
                        y: Math.floor(Math.random() * this.ROWS)
                    };

                    //1. Verificar "Zona segura" 5x5 alrededor de la cabeza
                    // (Si la diferencia en X o Y es menor a 2, esta muy cerca)
                    const tooCloseX = Math.abs(obs.x - head.x) <= 2;
                    const tooCloseY = Math.abs(obs.y - head.y) <= 2;
                    const inSafeZone = tooCloseX && tooCloseY;

                    // 2. Verificar que no caiga sobre el cuerpo de la serpiente
                    const onSnake = this.snake.some(s => s.x === obs.x && s.y === obs.y);

                    // 3. Verificar que no haya otro muro ahi ya
                    const isDuplicate = this.obstacles.some(o => o.x === obs.x && o.y === obs.y);

                    // Si pasa todas las pruebas, se agrega
                    if (!inSafeZone && !onSnake && !isDuplicate) {
                        this.obstacles.push(obs);
                        count ++;
                    }

                    attempts++;
                }
                
                break;
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

        // Iniciar Nivel 1
        this.generateLevel(1);

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

            this.audio.eat();

            // Logica de niveles

            // 1. Niveles normales (1, 2, 3): Cambian cada 100 puntos (100, 200, 300)
            const isNormalLevelUp = this.score <= 300 && this.score % 100 === 0;

            // 2. Modo Experto (Nivel 4+): Cambia cada 200 puntos (500, 700, 900...)
            //(score % 200 === 100) detecta los hitos impares: 300, 500, 700...
            const isExpertRefresh = this.score > 300 && this.score % 200 === 100;

            if (isNormalLevelUp || isExpertRefresh) {
                this.generateLevel(this.level + 1);
            }

            // Aumentar velocidad siempre por debajo del nivel 4.
            if (this.level < 4 && this.score % 50 === 0) {
                if (this.speed > 70) this.speed -= 10;
            }
            
            this.placeFood()
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

        // DIBUJAR MUROS
        this.ctx.fillStyle = '#2d4d2d';
        this.obstacles.forEach(obs => {
            this.ctx.fillRect(
                obs.x * this.TILE_SIZE,
                obs.y * this.TILE_SIZE,
                this.TILE_SIZE,
                this.TILE_SIZE
            );
            // Un poco de brillo para darle toque 3D
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(obs.x * this.TILE_SIZE + 2, obs.y * this.TILE_SIZE + 2, this.TILE_SIZE - 4, this.TILE_SIZE -4);
            this.ctx.fillStyle = '#2d4d2d'; // Reset color
        })

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
                if (this.direction.y === 0){
                    this.nextDirection = { x: 0, y: -1 };
                    this.audio.turn();
                } 
                break;
            case 'ArrowDown':
                if (this.direction.y === 0) {
                    this.nextDirection = { x: 0, y: 1};
                    this.audio.turn();
                } 
                break;
            case 'ArrowLeft':
                if (this.direction.x === 0){
                    this.nextDirection = { x: -1, y: 0};
                    this.audio.turn();
                } 
                break;
            case 'ArrowRight':
                if (this.direction.x === 0){
                    this.nextDirection = { x: 1, y: 0};
                    this.audio.turn();
                } 
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

            // 1. Chequea serpiente
            const onSnake = this.snake.some( s => s.x === this.food.x && s.y === this.food.y);

            // 2. Chequea muros
            const onWall = this.obstacles.some(o => o.x ===  this.food.x && o.y === this.food.y);

            // 3. Combinar Ambas
            valid = !onSnake && !onWall;
            
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

        // 3. Obstaculos
        // Si la cabeza choca con algun muro del array
        if (this.obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
            return true;
        }

        return false;
    }

    gameOver() {
        this.startShake(10);
        this.audio.die();
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
