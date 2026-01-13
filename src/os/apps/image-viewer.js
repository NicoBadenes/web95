/**
 * @file src/os/apps/image-viewer.js
 * @description Aplicacion nativa para visualizar imagenes.
 */

import { mk } from '../../utils/dom.js';

class ImageViewerApp{
    /**
     * Inicia el visor de imagenes.
     * @param {string} path - Ruta del archivo en el VFS.
     * @param {string} srcUrl - La URL real de la imagen (contenido del nodo VFS).
     */
    run(path, srcUrl) {
        // 1. Crear la imagen
        // En el VFS simulado, el "contenido" de un archivo .png
        // Sera la ruta relativa real al archivo en la carpeta /images del servidor.
        const img = mk('img', {
            attributes: {
                src: srcUrl,
                alt: path,
                style: 'max-width: 100%; max-height: 100%; object-fit: contain; display: block;'
            },
            // Prevenir arrastre fantasma de la imagen nativa del navegador
            events: {
                mousedown: (e) => e.preventDefault()
            }
        });

        //2. Contenedor principal
        //Usa flexbox para centrar la imagen en la ventana gris
        const container = mk('div', {
            className: 'app-image-viewer',
            attributes: {
                style: `
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    background-color: var(--clr-silver);
                    overflow: hidden;
                    padding: 2px;
                `
            },
            children: [img]
        });

        return container;
    }
}

export const imageViewer = new ImageViewerApp();