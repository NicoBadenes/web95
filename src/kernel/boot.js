/**
 * @file src/kernel/boot.js
 * @description Gestiona la secuencia de inicio simulada (BIOS POST).
 */

import { mk, $ } from '../utils/dom.js';
import { audio } from '../utils/audio.js';

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
        "PhoenixBIOS 4.0 Release 6.0",
        "Copyright (C) 1985-1995 Phoenix Technologies Ltd.",
        "",
        "CPU: Intel Pentium 133MHz",
        "640K System RAM Passed",
        "15360K Extended RAM Passed",
        "512K Cache SRAM Passed",
        "",
        "System BIOS shadowed",
        "Video BIOS shadowed",
        "",
        "Mouse initialized",
        "Detecting HDD Primary Master... QUANTUM FIREBALL 1.2GB",
        "Detecting HDD Primary Slave... None",
        "Detecting CD-ROM Secondary Master... SONY CD-ROM 4X",
        "",
        "BOOTING Web95"
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

    // --- SONIDO DE INICIO ---
    try {
        await audio.playStartupSound();
        console.log("System Booted with Sound.");
    } catch (err) {
        console.warn("Audio blocked (Autoplay policy). Click anywhere to enable audio later.")
    }
}