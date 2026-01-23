/**
 * @file src/os/apps/image-viewer.js
 * @description Visor de imagenes con Auto-resize
 */

import { mk } from '../../utils/dom.js';

export const imageViewer = {
    /**
     * @param {string} title - Nombre del archivo
     * @param {string} src - La URL
     */
    run(title, src) {
        // 1. Crear la imagen
        const img = mk('img', {
            attributes: {
                src: src,
                // Usa el title como texto alternativo
                alt: title,
                style: 'width: 100%; height: 100%; object-fit: contain; display: block;'
            },
            // Evitar que se arrastre la imagen fantasma fuera de la ventana
            events: {
                mousedown: (e) => e.preventDefault()
            }
        });

        // 2. Contenedor
        const container = mk('div', {
            className: 'image-viewer-app',
            attributes: {
                style: `
                    width: 100%;
                    height: 100%;
                    background-color: var(--clr-silver);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `
            },
            children: [img]
        });

        // 3. Auto-Resize al terminal de cargar
        img.onload = () => {
            // Busca la ventana padre subiendo por el DOM
            const windowNode = container.closest('.window');

            if (windowNode) {
                // A. Medir dimensiones reales de la imagen
                const realW = img.naturalWidth;
                const realH = img.naturalHeight;

                // B. Definir limites (90% de la pantalla para no salirse)
                const maxW = window.innerWidth * 0.9;
                const maxH = window.innerHeight * 0.9;

                // C. Calcular tamaño final (Imagen + un poco de margen para bordes)
                let finalW = Math.min(realW + 20, maxW);
                let finalH = Math.min(realH + 40, maxH);

                // D. Minimos de seguridad (para no hacer una ventana micro)
                finalW = Math.max(finalW, 200);
                finalH = Math.max(finalH, 150);

                // E. Aplicar cambios a la ventana
                windowNode.style.width = `${finalW}px`;
                windowNode.style.height = `${finalH}px`;

                // F. Re-centrar la ventana en la pantalla con el nuevo tamaño
                const newLeft = (window.innerWidth - finalW) / 2;
                const newTop = (window.innerHeight - finalH) / 2;

                windowNode.style.left = `${newLeft}px`;
                windowNode.style.top = `${newTop}px`;
            }
        };

        return container;
    }
}