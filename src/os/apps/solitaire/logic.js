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
}