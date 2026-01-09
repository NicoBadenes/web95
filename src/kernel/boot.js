/**
 * @file src/kernel/boot.js
 * @description Gestiona la secuencia de inicio simulada (BIOS POST).
 */

import { mk, $ } from '../os/utils/dom.js';

const BOOT_CONFIG = {
    LINE_DELAY: 400, //Tiempo entre lineas
    POST_DELAY: 1500 //Tiempo final antes de limpiar
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function initBootSequence() {
    const biosScreen = $('#bios-text');
    const bootContainer = $('#boot-screen');
    const osRoot = $('#os-root');

    // Estilos temporales para el texto de arranque (hardcoded por ahora)
    biosScreen.style.color = '#fff';
    biosScreen.style.fontFamily = "'Courier New', monospace";
    biosScreen.style.padding = '20px';

    const bootLines = [
        "BIOS DATE 01/07/26 20:00:00 VER 1.0.0",
        "CPU: WebAssembly Virtual Core @ 4.0GHZ",
        "640k RAM SYSTEM... OK",
        "INITIALIZING VIDEO ADAPTER... OK",
        "LOADING VIRTUAL FILE SYSTEM...",
        "MOUNTING DRIVE C: ...",
        "SYSTEM CHECK COMPLETE.",
        "BOOTING Web95..."
    ];

    for (const line of bootLines){
        const lineElement = mk ('div', { text: line});
        biosScreen.appendChild(lineElement);
        await sleep(BOOT_CONFIG.LINE_DELAY);
    }

    await sleep(BOOT_CONFIG.POST_DELAY);

    //Ocultar BIOS y mostrar sistema
    bootContainer.classList.add('hidden');
    osRoot.classList.remove('hidden');

    //CAMBIO VISUAL FINAL: Fondo "Teal" de windows 95
    document.body.style.backgroundColor = 'var(--clr-teal)';
    console.log("System Booted.");
}