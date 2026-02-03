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
    }

    initGame() {
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
            // Reciclar: Waste vuelve al Deck (boca abajo y en orden inverso)
            while (this.waste.length > 0) {
                const card = this.waste.pop();
                card.faceUp = false;
                this.deck.push(card);
            }
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
        if (totalFoundation === 52) return 'WIN';

        // 2. Check Defeat (Sin mazo, sin descarte, y sin movimientos en mesa)
        // Solo declara derrota si NO quedan cartas en el mazo NI en el descarte
        if (this.deck.length === 0 && this.waste.length === 0) {
            if (!this.hasAvailableMoves()) {
                return 'LOSS';
            }
        }

        return 'PLAYING'
    }

    hasAvailableMoves() {
        // Revisa si alguna carta visible del tableau se puede mover
        for (let i = 0; i < 7; i++) {
            const col = this.tableau[i];
            if (col.length === 0) continue;

            // Revisa la carta tope (y las pilas si quisisera ser exhaustivo,
            // pero con revisar el tope basta para saber si el juego sigue vivo)
            const topCard = col[col.length - 1];

            // Puede ir a fundaciones?
            for (let s = 0; s < 4; s++) {
                if (this._isValidFoundationMove(topCard, s)) return true;
            }

            // Puede ir a otra columna ?
            for (let j = 0; j < 7; j++) {
                if (i === j) continue;
                const targetCol = this.tableau[j]
                const targetCard = targetCol[targetCol.length - 1];
                if (this.isValidTableauMove(topCard, targetCard)) return true;
            }
        }
        return false; // No se encontraron movimientos salvadores
    }
}

