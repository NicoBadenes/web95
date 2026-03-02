/**
 * @file src/kernel/boot.js
 * @description Gestiona la secuencia de inicio simulada (BIOS POST).
 */

import { mk, $ } from '../utils/dom.js';
import { audio } from '../utils/audio.js';
import { loginManager } from '../os/auth/login.js';

const BOOT_CONFIG = {
    LINE_DELAY: 400, //Tiempo entre lineas
    POST_DELAY: 1500 //Tiempo final antes de limpiar
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function initBootSequence() {
    const biosScreen = $('#bios-text');
    const bootContainer = $('#boot-screen');
    const osRoot = $('#os-root');

    // Estilos temporales para el texto de arranque
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

    // Ocultar la pantalla de BIOS
    bootContainer.classList.add('hidden');

    // INTERCEPTAR EN EL LOGIN
    // Como la funcion es async, el await congela la ejecucion del booteo
    // hasta que el usuario ponga la contraseña correcta o cree la cuenta.
    await loginManager.prompt();

    // Mostrar el sistema operativo
    osRoot.classList.remove('hidden');

    // Cambio visual final, fondo Teal.
    document.body.style.backgroundColor = 'var(--clr-teal)';
    console.log("System Booted.");

    // Sonido de inicio
    audio.playStartupSound()
        .then(() => console.log("System Booted with Sound."))
        .catch(err => console.warn("Audio blocked by browser (Autoplay). System continued anyway."));
}