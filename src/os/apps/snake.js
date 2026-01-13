/**
 * @file src/os/apps/snake.js
 * @description Juego clasico de la serpiente utilizando Canvas API.
 * Implementa un Game Loop manual y deteccion de colisiones.
 */

import { mk } from '../../utils/dom.js'
import { audio } from '../../utils/audio.js'

class SnakeGame{
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.intervalId = null; //Para controlar la velocidad del juego

        // Configuracion del juego
        this.gridSize =  20; // Tamaño de cuada cuadro
        this.tileCount = 20; // Cantidad de cuadros (20x20)

        // Estado
        this.snake = [];
        this.apple = { x: 15, y: 15};
        this.velocity = { x: 0, y: 0};
        this.lastVelocity = { x: 0, y: 0};
        this.score = 0;
        this.isRunning = false;
    }

    /**
     * Inicia la applicacion y devuelve el contenedor DOM.
     */
    run() {
        // 1. Crear Canvas
        // Tamaño real: 20 * 20 = 400px
        const size = this.gridSize * this.tileCount;

        this.canvas = mk('canvas', {
            attributes: {
                width: size,
                height: size,
                style: 'background-color: black; display: block; margin: 0 auto;'
            }
        });

        this.ctx = this.canvas.getContext('2d');

        // 2. Panel de puntuacion
        this.scoreElement  = mk('div', {
            text: 'Score: 0',
            attributes: {
                style: 'color: var(--clr-black); font-weight: bold; padding: 5px; text-align: center;'
            }
        });

        //3. Contenedor principal
        const container = mk('div', {
            className: 'app-snake',
            attributes: {
                style: 'display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: var(--clr-silver); height; 100%;'
            },
            children: [this.scoreElement, this.canvas],
            // Hace que el contenedor pueda recibir foco para capturar teclado
            attributes: { tabindex: '0' },
            events: {
                keydown: (e) => this.handleInput(e)
            }
        });

        // Enfocar el contenedor automaticamente para que el teclado funcione ya
        setTimeout(() => container.focus(), 100);

        // Iniciar juego
        this.resetGame();

        // Arrancar el Game Loop (13 FPS para estilo retro)
        this.intervalId = setInterval (() => this.gameLoop(), 1000 / 10);

        return container;
    }

    resetGame() {
        this.snake = [{ x: 10, y: 10 }]; // Cabeza inicial
        this.velocity = { x: 0, y: 0}; //Quieto al principio
        this.lastVelocity = { x: 0, y: 0};
        this.score = 0;
        this.placeApple();
        this.isRunning = true;
        this.updateScore();
    }

    handleInput(e) {
        // Evitar scroll con las flechas
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        switch(e.key) {
            case 'ArrowUp':
                if (this.lastVelocity.y === 1) break;
                this.velocity = { x: 0, y: -1 };
                break;
            case 'ArrowDown':
                if (this.lastVelocity.y === -1) break;
                this.velocity = { x: 0, y: 1};
                break;
            case 'ArrowLeft':
                if (this.lastVelocity.x === 1) break;
                this.velocity = { x: -1, y: 0};
                break;
            case 'ArrowRight':
                if (this.lastVelocity.x === -1) break;
                this.velocity = { x: 1, y: 0};
                break;
        }
    }

    gameLoop() {
        if (!this.isRunning || !this.ctx) return;

        // 1. Mover Serpiente
        const head = {
            x: this.snake[0].x + this.velocity.x,
            y: this.snake[0].y + this.velocity.y
        };

        // 2. Detectar Colisiones (Paredes)
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return this.gameOver();
        }

        // 3. Detectar Colisiones (con la propia serpiente)
        for (let i = 0; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y && this.snake.length > 1) {
                // La serpiente solo muere si se mueve (evita que muera al principio)
                if(this.velocity.x !== 0 || this.velocity.y !== 0) {
                    return this.gameOver();
                }
            }
        }

        // Mover cabeza
        this.snake.unshift(head);
        
        // 4. Comer manzana
        if (head.x === this.apple.x && head.y === this.apple.y) {
            this.score ++;
            this.updateScore();
            this.placeApple();

            //SONIDO: Usa el sistema de audio para un mini "bip"
            audio.playError();
        }else {
            if (this.velocity.x !== 0 || this.velocity.y !== 0) {
                this.snake.pop();
            }else {
                // Si esta quito al inicio, corrige el unshift extra
                this.snake.shift();
            }
        }

        //5. Renderizar
        this.draw();

        this.lastVelocity = { ...this.velocity };
    }

    draw() {
        // Fondo negro
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Manzana (Roja)
        this.ctx.fillStyle = '#ff5555';
        this.ctx.fillRect(
            this.apple.x * this.gridSize,
            this.apple.y * this.gridSize,
            this.gridSize - 2,
            this.gridSize - 2
        );

        //2. Serpiente (Verde)
        this.ctx.fillStyle = '#55ff55';
        this.snake.forEach(part => {
            this.ctx.fillRect(
                part.x * this.gridSize,
                part.y * this.gridSize,
                this.gridSize - 2,
                this.gridSize - 2
            );
        });
    }

    placeApple() {
        let validPosition = false;

        while(!validPosition) {
            // 1. Elegir posicion al azar
            this.apple = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };

            //2. Verificar que NO caiga sobre la serpiente
            // .some() devuelve true si algun segmento coincide con la manzana
            const onSnake = this.snake.some(part =>
                part.x === this.apple.x && part.y === this.apple.y
            );

            // Si no esta en la serpiente, es valida y sale del bucle
            if (!onSnake) {
                validPosition = true;
            }
        }
    }

    updateScore() {
        if(this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`;
    }

    gameOver() {
        this.velocity = { x: 0, y: 0};
        audio.playError(); //Sonido de muerte
        alert(`Game Over! Score: ${this.score}`);
        this.resetGame();
    }
}

export const snakeGame = new SnakeGame();