/**
 * @file src/os/apps/solitaire/index.js
 * @description Fisica de Cartas (Drag & Drop + Snap Back) y reglas y movimientos
 */

import { mk, loadCSS, $ } from '../../../utils/dom.js';
import { SolitaireEngine} from './logic.js';

let listenersAttached = false;
let gameInstance = null;
let uiRefs = {};

// Estado del drag 
let dragState = {
    isDragging: false,
    cards: [],             // Las cartas q estas moviendo
    originCol: null,      // De q columna salieron
    originIndex: null,    // Indice original
    startX: 0, startY: 0, // Posicion inicial del mouse
    initialPositions: []  // Para el "Snap back" 
};

export const solitaireApp = {
    run() {
        loadCSS('solitaire-css', 'src/os/apps/solitaire/solitaire.css');

        gameInstance = new SolitaireEngine();
        gameInstance.initGame();

        const board = buildBoard();

        // Inicializa listeners de Drag & Drop
        setupDragEvents(board);
        
        // Repartir
        renderTableau(gameInstance, uiRefs.tableauCols);
        renderDeck(gameInstance);

        console.log('Physics Engine Loaded.')
        return board;
    }
};

// Construccion UI
function buildBoard() {
    const deckArea = mk('div', {
        className: 'deck-area',
        children: [
            mk('div', { className: 'slot', attributes: { id: 'stock-slot' } }),
            mk('div', { className: 'slot', attributes: { id: 'waste-slot '} })
        ]
    });

    const foundationArea = mk('div', {
        className: 'foundation-area',
        children: [
            mk('div', { className: 'slot', attributes: { 'data-foundation': '0' } }),
            mk('div', { className: 'slot', attributes: { 'data-foundation': '1' } }),
            mk('div', { className: 'slot', attributes: { 'data-foundation': '2' } }),
            mk('div', { className: 'slot', attributes: { 'data-foundation': '3' } })
        ]
    });

    const topSection = mk('div', {
        className: 'top-section',
        children: [deckArea, foundationArea]
    });

    const tableauColsElements = [];
    for (let i = 0; i < 7; i++) {
        const col = mk('div', {
            className: 'tableau-col',
            attributes: { 'data-col': i }
        });
        tableauColsElements.push(col);
    }
    uiRefs.tableauCols = tableauColsElements;

    const tableauArea = mk('div', {
        className: 'tableau-area',
        children: tableauColsElements
    });

    return mk('div', {
        className: 'solitaire-board',
        children: [topSection, tableauArea]
    });
}

// Renderizado
function renderTableau(game, colElements) {
    game.tableau.forEach((colData, colIndex) => {
        const domCol = colElements[colIndex];
        domCol.innerHTML = '';

        colData.forEach((card, cardIndex) => {
            const cardEl = createCardElement(card);

            // Posicionamiento absoluto relativo a la columna
            cardEl.style.top = `${cardIndex * 25}px`;

            // Datos importantes para el drag
            cardEl.dataset.col = colIndex;
            cardEl.dataset.index = cardIndex;

            domCol.appendChild(cardEl);
        });
    });
}

function renderDeck(game) {
    const stockSlot = document.getElementById('stock-slot');
    if (!stockSlot) return;
    stockSlot.innerHTML = '';
    if (game.deck.length > 0) {
        stockSlot.appendChild(mk('div', { className: 'card back' }));
    }
}

function createCardElement(card) {
    const el = mk('div', { className: 'card' });

    if (!card.faceUp) {
        el.classList.add('back');
        return el;
    }

    el.classList.add(card.color);

    // Contenido visual
    const topCorner = mk('div', { className: 'corner-top', text: `${card.rank} ${card.suit}` });
    const bottomCorner = mk('div', { className: 'corner-bottom', text: `${card.rank} ${card.suit}` });
    const center = mk('div', { className: 'card-center', text: card.suit, style: 'font-size: 40px; text-align: center; margin-top: 10px;' });

    el.appendChild(topCorner);
    el.appendChild(center);
    el.appendChild(bottomCorner);
    return el;
}

// Fisica y drag & drop

function setupDragEvents(boardElement) {
    // Mousedown: aggarra carta(s)
    boardElement.addEventListener('mousedown', (e) => {
        const cardEl = e.target.closest('.card');
        // Solo arrastra si es carta, no esta boca abajo, y no esta ya arrastrando
        if (!cardEl || cardEl.classList.contains('back') || dragState.isDragging) return;
        e.preventDefault();
        // Iniciar drag
        startDrag(e, cardEl);
    });

    // 2. Mousemove: mover
    if (!listenersAttached) {
        document.addEventListener('mousemove', (e) => {
            if (!dragState.isDragging) return;
            moveDrag(e);
        });

        // 3. Mouseup: soltar
        document.addEventListener('mouseup', (e) => {
            if (!dragState.isDragging) return;
            endDrag(e);
        });

        listenersAttached = true;
    }
}

function startDrag(e, cardEl) {
    dragState.isDragging = true;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;

    // Identificar columna e indice
    const colIdx = parseInt(cardEl.dataset.col);
    const cardIdx = parseInt(cardEl.dataset.index);

    dragState.originCol = colIdx;
    dragState.originIndex = cardIdx;

    // Seleccionar esta carta y tdas las que esten encima
    // Pilas de cartas
    const colContainer = uiRefs.tableauCols[colIdx];
    const allCardsInCol = Array.from(colContainer.children);

    // Corta desde la carta seleccionada hasta el final
    dragState.cards = allCardsInCol.slice(cardIdx);

    // Preparar las cartas para levantarlas
    dragState.initialPositions = [];

    dragState.cards.forEach(card => {
        // Guardar posicion original para el snap back
        const rect = card.getBoundingClientRect();
        dragState.initialPositions.push({ top: card.style.top, left: card.style.left });

        // Cambiar a fixed para q floten 
        // Ajusto width manual para q no se deforme al salir del contenedor
        card.style.width = rect.width + 'px';
        card.style.height = rect.height + 'px';
        card.style.position = 'fixed';
        card.style.left = rect.left + 'px';
        card.style.top = rect.top + 'px';
        card.style.zIndex = '9999';
        card.style.pointerEvents = 'none';
    });
}

function moveDrag(e) {
    // Calcular cuanto se movio el mouse
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    // Mover cada carta arrastrada
    dragState.cards.forEach((card, index) => {
        const initialRect = dragState.initialPositions[index];
        // Como cambie a fixed, no se puede usar initialPositions directo del style
        // Se necesita sumar el delta al valor actual.
        // O sea mueve sumando dx/dy al valor que tenian al momento del click

        const currentLeft = parseFloat(card.style.left);
        const currentTop = parseFloat(card.style.top);

        // Actualiza start para el siguiente frame
        card.style.left = (currentLeft + (e.movementX)) + 'px';
        card.style.top = (currentTop +  (e.movementY)) + 'px';
    });

    // Actualiza referencias para el proximo frame
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
}

function endDrag(e) {
    dragState.isDragging = false;

    // 1. Detectar donde se suelta (Drop Target)
    // Como las cartas que se arrastran tienen pointerEvents='none',
    // el elementFromPoint va a ver lo que esta "debajo" de las cartas
    const dropTarget = getDropTarget(e.clientX, e.clientY);

    let moveSuccessful = false;

    if (dropTarget) {
        // Intenta mover en el Motor Logico
        // dropTarget.col es el indice de la columna destino (0-6)
        if (dropTarget.type === 'tableau') {
            moveSuccessful = gameInstance.moveTableauToTableau(
                dragState.originCol,
                dropTarget.col,
                dragState.originIndex
            );
        }
    }

    if (moveSuccessful) {
        // Si funciono, re-renderiza todo el tablero para mostrar el nuevo estado
        // (Esto tambien arregla los estilos fixed/absolute automaticamente)
        console.log("Move successful");
        renderTableau(gameInstance, uiRefs.tableauCols);
    } else{
        // Si fallo (reglas invalidas o soltado en la nada), Snap Back
        console.log("Invalid move -> Snap Back");
        renderTableau(gameInstance, uiRefs.tableauCols);
    }

    dragState.cards = [];
}

/**
 * Averigua sobre que columna se suelta el mouse
 */
function getDropTarget(x, y) {
    // Busca elemento bajo el mouse
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Es una columna o una carta dentro de una columna?
    const colElement = element.closest('.tableau-col');
    if (colElement) {
        const colIndex = parseInt(colElement.dataset.col);
        return { type: 'tableau', col: colIndex };
    }

    // (Logica para foundation despues)

    return null;
}