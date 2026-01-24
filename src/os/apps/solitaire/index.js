/**
 * @file src/os/apps/solitaire/index.js
 * @description Punto de entrada de la app (testing)
 */

import { SolitaireEngine } from "./logic.js";
import { mk } from '../../../utils/dom.js';

export const solitaireApp = {
    run() {
        console.group("🃏 Solitaire Logic Test ")
        
        // 1. Instanciar motor
        const game = new SolitaireEngine();
        console.log("Engine started.");

        // 2. Iniciar juego (Barajar y repartir)
        game.initGame();
        console.log("Game initialized (Shuffled and Dealt).");

        // 3. Verificar el Mazo restante
        // Total 52 cartas, Se reparten 28 en el tablero (1+2+3+4+5+6+7).
        // Deberian sobrar 24 cartas en el mazo.
        const deckCount = game.deck.length;
        console.log(`Cards in deck: ${deckCount} (Expected: 24) -> ${deckCount === 24 ? 'OK' : 'FAIL'}`);

        // 4. Verificar las columnas (Tableau)
        console.log("Verifying tableau columns:");
        let totalTableauCards = 0;

        game.tableau.forEach((col, index) => {
            const count = col.length;
            totalTableauCards += count;
            const expected = index + 1; // Col 0 debe tener 1 carta, Col 1 debe tener 2 cartas...

            // La ultima carta debe estar boca arriba
            const lastCard = col[col.length - 1];
            const isFaceUp = lastCard ? lastCard.faceUp : false;

            const colStatus = (count === expected && isFaceUp) ? 'OK' : 'FAIL';

            console.log(
                `   Column ${index + 1}: Has ${count} cards. ` + 
                `Last: ${lastCard.rank}${lastCard.suit} (faceUp: ${isFaceUp}) ` +
                `-> ${colStatus}`
            );
        });

        console.log(`Total cards on table: ${totalTableauCards} (Expected: 28)`);
        console.groupEnd();

        // Retorna un div simple para q la ventana no de error al abrirse
        return mk('div', {
            text: 'Test executed. Check Console.',
            style: 'padding: 20px; color: white; background: #008000; height: 100%;'
        });
    }
};
