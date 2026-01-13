/**
 * @file src/os/utils/audio.js
 * @description Gestor de audio del sistema utilizando Web Audio API.
 * Capaz de sintetizar sonidos y reproducir efectos sin archivos externos.
 */

class AudioManager{
    constructor() {
        // Inicia el contexto de audio de manera lazy
        // o lo prepara para ser reanudado.
        this.ctx = null;
        this.isMuted = false;
    }

    /**
     * Inicializa o recupera el AudioContext.
     * @returns {AudioContext}
     */
    getContext(){
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        return this.ctx;
    }

    /**
     * Intenta reanudar el contexto si el navegador lo suspendio (Autoplay Policy).
     */
    async resume(){
        const ctx = this.getContext();
        if(ctx.state === 'suspended'){
            await ctx.resume();
        }
    }

    /**
     * Reproduce el Sonido de Inicio sintetizado (estilo Win95/Ambient).
     * Crea un acorde complejo usando multiples osciladores.
     */
    async playStartupSound() {
        if (this.isMuted) return;

        await this.resume();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        // Define un acorde de Bienvenida (Eb Major 7 con extensiones, estilo ambient)
        // Frecuencias: Eb3, G3, Bb3, D4, F4
        const frequencies = [155.56, 196.00, 233.08, 293.66, 349.23];

        frequencies.forEach((freq, index) => {
            // 1. Crear Oscilador
            const osc = ctx.createOscillator();
            osc.type = index % 2 === 0 ? 'sine' : 'triangle'; //Mezcla ondas para riqueza timbrica
            osc.frequency.value = freq;

            //2. Crear Gain (Control de volumen/Envolvente)
            const gain = ctx.createGain();

            //3. Configurar envolvente (ADSR simulado)
            // Ataque suave, sustain largo, decay lento
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.1, t + 0.5 + (index * 0.1)); //Entrada escalonada "arpegiada" muy rapida
            gain.gain.exponentialRampToValueAtTime(0.001, t + 6); // Fade out largo de 6 segundos

            //4. Efecto de Paneo (Stereo)
            const panner = ctx.createStereoPanner();
            // Distribuir notas entre izquierda (-1) y derecha (1)
            panner.pan.value = -0.5 + (index / (frequencies.length - 1));

            //5. Conectar grafos: Osc -> Gain -> Panner -> Salida
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(ctx.destination);

            //6. Ejectuar
            osc.start(t);
            osc.stop(t + 6.5);
        });
    }

    /**
     * Reproduce un "Beep de error simple."
     */
    playError() {
        if(this.isMuted) return;
        this.resume();
        const ctx = this.getContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
    }
}

// Singleton exportado
export const audio = new AudioManager();