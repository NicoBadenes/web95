/**
 * @file src/os/apps/solitaire/logic.js
 * @description Logica del juego (Reglas, estado, fundaciones)
 */

export const SUITS = ['♠', '♥', '♣', '♦'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export class Card {
    constructor (suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
        this.id = `${rank}-${suit}`;
    }

    get color() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }

    get value() {
        return RANKS.indexOf(this.rank) + 1;
    }
}

export class SolitaireEngine {
    constructor() {
        this.deck = [];
        this.waste = [];
        this.foundations = { '♠': [], '♥': [], '♣': [], '♦': [] };
        this.tableau = [[], [], [], [], [], [], []];

        this.deckPasses = 0;
        this.maxPasses = 3;
    }

    initGame() {
        this.deckPasses = 0;
        this.createDeck();
        this.shuffleDeck();
        this.deal();
    }

    createDeck() {
        this.deck = [];
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                this.deck.push(new Card(suit,rank));
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    deal() {
        this.tableau = [[], [], [], [], [], [], []];
        this.waste = [];
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck.pop();
                if (j === i) card.faceUp = true;
                this.tableau[i].push(card);
            }
        } 
    }

    // Funcionalidad del mazo
    drawCard() {
        if (this.deck.length > 0) {
            // Sacar del mazo, poner boca arriba en waste
            const card = this.deck.pop();
            card.faceUp = true;
            this.waste.push(card);
        } else if (this.waste.length > 0) {
            // Si ya dio el maximo de vueltas, no recical mas
            if (this.deckPasses >= this.maxPasses){
                return;
            }
            // Reciclar: Waste vuelve al Deck
            while (this.waste.length > 0) {
                const card = this.waste.pop();
                card.faceUp = false;
                this.deck.push(card);
                
            }
            this.deckPasses++; // Contar una vuelta mas
        }
    }

    // Reglas y movimientos
    
    isValidTableauMove(childCard, parentCard) {
        //si la columna destino esta vacia, solo acepta rey (K)
        if (!parentCard) {
            return childCard.rank === 'K';
        }
        // Regla: Color alternado y Valor descendente
        const isDifferentColor = childCard.color !== parentCard.color;
        const isNextValue = parentCard.value === childCard.value + 1;

        return isDifferentColor && isNextValue;
    }

    /**
     * Intenta mover cartas de una columna a otra.
     * @returns {boolean} true si el movimiento fue existoso
     */
    moveTableauToTableau(fromColIdx, toColIdx, cardIndexInSource) {
        const sourceCol = this.tableau[fromColIdx];
        const targetCol = this.tableau[toColIdx];

        // Cartas que se quieren mover (sea una o mas)
        const movingCards = sourceCol.slice(cardIndexInSource);
        const topMovingCard = movingCards[0];

        // Carta donde van a ser soltadas
        const targetCard = targetCol[targetCol.length - 1]; // puede ser undefined si esta vacia

        // Verificar reglas
        if (this.isValidTableauMove(topMovingCard, targetCard)) {
            // 1. Ejecutar moviminetos en memoria
            //Quitar de origen
            sourceCol.splice(cardIndexInSource);
            // Poner en destino
            targetCol.push(...movingCards);

            // 2. Dar vuelta la nueva carta tope de la columna origen (si hay alguna)
            if (sourceCol.length > 0) {
                const newTop = sourceCol[sourceCol.length - 1];
                newTop.faceUp = true;
            }

            return true;
        }

        return false;
    }

    /**
     * Intenta subir una carta a la fundacion
     */
    moveTableauToFoundation(fromColIdx, foundationSuitIdx) {
        const sourceCol = this.tableau[fromColIdx];
        if (sourceCol.length === 0) return false;

        const card = sourceCol[sourceCol.length - 1]; // Solo se puede subir la ultima carta
        const targetSuit = SUITS[foundationSuitIdx];
        const pile = this.foundations[targetSuit];

        // Regla 1: El palo debe coincidir con el slot
        if (card.suit !== targetSuit) return false;

        // Regla 2: Orden ascendente (A, 2, 3...)
        if (pile.length === 0) {
            // Si esta vacia, solo acepta As
            if (card.rank !== 'A') return false;
        } else{
            // Si ya hay cartas, debe ser el siguiente valor
            const topCard = pile[pile.length - 1];
            if (card.value !== topCard.value + 1) return false;
        }

        // Si paso las reglas, continua
        pile.push(sourceCol.pop());

        // Voltea la de abajo en el tableau si quedo alguna
        if (sourceCol.length > 0) sourceCol[sourceCol.length - 1].faceUp = true;

        return true;
    }

    // Movimiento desde waste
    moveWasteToTableau(toColIdx) {
        if (this.waste.length === 0) return false;
        const card = this.waste[this.waste.length - 1];
        const targetCol = this.tableau[toColIdx];

        if (this.isValidTableauMove(card, targetCol[targetCol.length - 1])) {
            targetCol.push(this.waste.pop());
            return true;
        }
        return false;
    }

    moveWasteToFoundation(foundationSuitIdx) {
        if (this.waste.length === 0) return false;
        const card = this.waste[this.waste.length - 1];

        if (this._isValidFoundationMove(card, foundationSuitIdx)) {
            this.foundations[SUITS[foundationSuitIdx]].push(this.waste.pop());
            return true;
        }
        return false;
    }

    // Helper privado para no repetir logica
    _isValidFoundationMove(card, suitIdx) {
        const targetSuit = SUITS[suitIdx];
        const pile = this.foundations[targetSuit];
        if (card.suit !== targetSuit) return false;
        if (pile.length === 0) return card.rank === 'A';
        return card.value === pile[pile.length - 1].value + 1;
    }

    // Estado del juego

    checkGameState() {
        // 1. Check Victory (52 cartas en fundaciones)
        let totalFoundation = 0;
        SUITS.forEach(suit => totalFoundation += this.foundations[suit].length);
        console.log(`Checking Win Condition: ${totalFoundation} / 52 cards collected.`)

        if (totalFoundation === 52) return 'WIN';

        console.log(`[DEBUG] Deck: ${this.deck.length} cards left. Passes: ${this.deckPasses}/${this.maxPasses}`);
        console.log(`[DEBUG] Running analysis...`);

        const hasMoves = this.hasProductiveMoves();
     
        if (hasMoves) {
            console.log(`[DEBUG] Moves detected - Game Continues`);
            return 'PLAYING';
        }

        if (this.deck.length > 0 || this.deckPasses < this.maxPasses){
            console.log(`[DEBUG] No moves on board, but deck is available. Game continues.`);
            return 'PLAYING';
        }
        
        console.log(`[DEBUG] No moves detected and deck is empty - Game Over`);
        return 'LOSS';
    }

    /**
     * Verifica si existe algun movimiento productivo (un movimiento que pueda desencadenar en otro)
     */
    hasProductiveMoves() {
        // A. Waste -> Foundations o Tableau (considerando que barajar el deck puede llegar a ser util)
        if (this.waste.length > 0) {
            const topWaste = this.waste[this.waste.length - 1];
            // Waste -> Foundation
            for (let s = 0; s < 4; s++) {
                if (this._isValidFoundationMove(topWaste, s)) return true;
            }
            // Waste -> Tableau
            for (let c = 0; c < 7; c++) {
                const targetCol = this.tableau[c];
                const targetCard = targetCol[targetCol.length - 1];
                if (this.isValidTableauMove(topWaste, targetCard)) return true;
            }
        }

        // B. Tableau -> Foundation
        for (let i = 0; i < 7; i++) {
            const col = this.tableau[i];
            if (col.length === 0) continue;
            const topCard = col[col.length - 1];
            for (let s = 0; s < 4; s++) {
                if (this._isValidFoundationMove(topCard, s)) return true;
            }
        }

        // C. Tableau -> Tableau
        for (let i = 0; i < 7; i++) {
            const col = this.tableau[i];
            if (col.length === 0) continue;

            const firstFaceUp = col.findIndex(c => c.faceUp);
            if (firstFaceUp === -1) continue;

            // Revisar cada posible movimiento de esta columna
            for (let k = firstFaceUp; k < col.length; k++) {
                const cardToCheck = col[k];

                for (let j = 0; j < 7; j++) {
                    if (i === j) continue;

                    const targetCol = this.tableau[j];
                    const targetCard = targetCol[targetCol.length - 1];

                    // Si el movimiento es legal
                    if (this.isValidTableauMove(cardToCheck, targetCard)) {
                        // verificar si es util
                        if (this._simulateMoveAndCheckProgress(i, j, k)) {
                            return true; // Al menos un movimiento desencadena en otro
                        }
                    }
                }
            }
        }

        return false; // Ningun movimiento desencadena
    }

    /**
     * Somula un movimiento, ve si puede desencadenar en otro, y revierte
     */
    _simulateMoveAndCheckProgress(fromColIdx, toColIdx, cardIndex) {
        const sourceCol = this.tableau[fromColIdx];
        const targetCol = this.tableau[toColIdx];

        // 1. Guardar estado previo. habia carta debajo?
        const cardBelowIndex = cardIndex - 1;
        const wasFaceDown = (cardBelowIndex >= 0) && (!sourceCol[cardBelowIndex].faceUp);

        // Si desbloquea una carta oculta -> es util
        if (wasFaceDown) return true;

        // Si vacia columna -> es util
        if (cardIndex === 0) return true;

        // 2. Ejecutar movimiento en memoria (Simulacion)
        const movingCards = sourceCol.splice(cardIndex);
        targetCol.push(...movingCards);

        let isProductive = false;

        // 3. Chequear consecuencias

        // A. Desde waste
        if (this.waste.length > 0) {
            const wasteCard = this.waste[this.waste.length - 1];
            const newTopSource = sourceCol.length > 0 ? sourceCol[sourceCol.length - 1] : null;
            if (this.isValidTableauMove(wasteCard, newTopSource)) {
                isProductive = true;
            }
        }

        // B. Desde otra columna
        if (!isProductive) {
            for (let c = 0; c < 7; c++) {
                if (c === fromColIdx || c === toColIdx) continue;
                const otherCol = this.tableau[c];
                if (otherCol.length === 0) continue;

                const otherFaceUp = otherCol.findIndex(ca => ca.faceUp);
                if (otherFaceUp === -1) continue;
                const otherCard = otherCol[otherFaceUp];

                const newTopSource = sourceCol.length > 0 ? sourceCol[sourceCol.length - 1] : null;
                if (this.isValidTableauMove(otherCard, newTopSource)) {
                    isProductive = true;
                    break;
                }
            }
        }

        // 4. Revertir (backtracking)
        const movedBack = targetCol.splice(targetCol.length - movingCards.length);
        sourceCol.push(...movedBack);

        return isProductive;
    }
}

