/**
 * @file src/os/apps/solitaire/logic.js
 * @description Logica del juego (modelo de datos).
 */

export const SUITS = ['♠', '♥', '♣', '♦'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export class Card {
    constructor (suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false; // Por defecto boca abajo
        this.id = `${rank}-${suit}`; // Identificador unico (ej: "10-♥")
    }

    // Helper para saber si es roja (Corazones o Diamantes)
    get color() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }

    // Helper para obtener valor numerico (para comparar mayor/menor)
    get value() {
        return RANKS.indexOf(this.rank) + 1;
    }
}

export class SolitaireEngine {
    constructor() {
        // Estado del juego
        this.deck = []; // Mazo principal
        this.waste = []; // Descarte

        // Las 4 fundaciones
        this.foundations = {
            '♠': [], '♥': [], '♣': [], '♦': []
        };

        // Las 7 columnas del tablero (Tableau)
        // Array de Arrays, tableau [0] es la columna 1, etc.
        this.tableau = [[], [], [], [], [], [], []];
    }

    // 1. Crear mazo y barajar
    initGame() {
        this.createDeck();
        this.shuffleDeck();
        this.deal();
    }

    createDeck() {
        this.deck = [];
        for (let suit of SUITS) {
            for (let rank of RANKS) {
                this.deck.push(new Card(suit, rank));
            }
        }
    }

    // Algoritmo Fisher-Yates (Barajado perfecto)
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    // 2. Repartir inicial
    deal() {
        // Limpiar tablero
        this.tableau = [[], [], [], [], [], [], []];
        this.waste = [];

        // Repartir en escalera
        // Col 1: 1 carta, Col 2: 2 cartas...
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck.pop();
                // La ultima de cada columna va boca arriba
                if (j === i) card.faceUp = true;
                this.tableau[i].push(card);
            }
        }

        // El resto queda en this.deck
    }

    // --- Reglas de movimiento (Validaciones) ---

    /**
     * Verifica si se puede poner la carta 'child' encima de la 'parent' en el tablero.
     * Regla: Color alternado y Valor Descendente
     */
    isValidTableauMove(childCard, parentCard) {
        // Si no hay padre (espacio vacio), solo se admite REY (K)
        if (!parentCard) {
            return childCard.rank === 'K';
        }

        const isDifferentColor = childCard.color !== parentCard.color;
        const isNextValue = parentCard.value === childCard.value + 1;

        return isDifferentColor && isNextValue;
    }
}