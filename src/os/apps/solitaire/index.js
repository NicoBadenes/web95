/**
 * @file src/os/apps/solitaire/index.js
 * @description Construccion del Tablero Visual (UI Layout)
 */

import { mk, loadCSS } from '../../../utils/dom.js';
import { SolitaireEngine } from './logic.js';

export const solitaireApp = {
    run() {
        loadCSS('solitaire-css', 'src/os/apps/solitaire/solitaire.css')
        
        // Instanciar motor
        const game = new SolitaireEngine();
        game.initGame();

        console.log('Solitaire UI: Board Rendered.');

        // Construccion del tablero

        // Area del mazo (Izquierda arriba)
        const deckArea = mk('div', {
            className: 'deck-area',
            children: [
                // Slot del mazo
                mk ('div', { className: 'slot', attributes: { id: 'stock-slot' } }),
                // Slot de descarte (waste)
                mk('div', { className: 'slot', attributes: { id: 'waste-slot' } })
            ]
        });

        // Area de funcaciones (Derecha arriba - 4 espacios)
        const foundationArea = mk('div', {
            className: 'foundation-area',
            children: [
                mk('div', { className: 'slot', attributes: { 'data-foundation': '0' } }),
                mk('div', { className: 'slot', attributes: { 'data-foundation': '1' } }),
                mk('div', { className: 'slot', attributes: { 'data-foundation': '2' } }),
                mk('div', { className: 'slot', attributes: { 'data-foundation': '3' } })
            ]
        });

        // Agrupar A y B en la seccion superior
        const topSection = mk('div', {
            className: 'top-section',
            children: [deckArea, foundationArea]
        });

        // Area del tablero (Abajo - las 7 columnas)
        const tableauCols = [];
        for (let i = 0; i < 7; i++) {
            tableauCols.push(mk('div', {
                className: 'tableau-col',
                attributes: { 'data-col': i }
            }));
        }

        //Div padre q contiene las columnas
        const tableauArea = mk('div', {
            className: 'tableau-area',
            children: tableauCols
        });

        // Retornar el tablero completo
        return mk('div', {
            className: 'solitaire-board',
            children: [topSection, tableauArea]
        });
    }
};
