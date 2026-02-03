/**
 * @file src/os/apps/solitaire/index.js
 * @description Fisica de Cartas (Drag & Drop + Snap Back) y reglas y movimientos + fundacinoes + bugfix de velocidad
 */

import { mk, loadCSS, $ } from '../../../utils/dom.js';
import { SolitaireEngine, SUITS} from './logic.js';

let listenersAttached = false;
let gameInstance = null;
let uiRefs = {};

// Estado del drag 
let dragState = {
    isDragging: false,
    cards: [],            // Las cartas q estas moviendo
    originType: null,     // Tableau o waste
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
        renderDeck(gameInstance, uiRefs.stockSlot);
        renderWaste(gameInstance, uiRefs.wasteSlot);
        renderFoundations(gameInstance, uiRefs.foundationSlots);

        console.log('Solitaire: Ready & Rendered.')
        return board;
    }
};

// Construccion UI
function buildBoard() {
    //A. Area del mazo (Guarda referencias explicitas)
    const stockSlot = mk('div', { className: 'slot', attributes: { id: 'stock-slot' } });
    const wasteSlot = mk('div', { className: 'slot', attributes: { id: 'waste-slot '} });

    // Guarda uiRefs para usarlos sin buscar en el DOM
    uiRefs.stockSlot = stockSlot;
    uiRefs.wasteSlot = wasteSlot;

    const deckArea = mk('div', {
        className: 'deck-area',
        children: [stockSlot, wasteSlot]
    });

    // B. Area de fundacinoes
    const foundationSlots = [];

    // Crea los 4 slots y los guarda
    SUITS.forEach((suit, i) => {
        const slot = mk('div', {
            className: 'slot',
            attributes: { 'data-foundation': i },
            text: suit
        });
        // Estilo inicial del placeholder
        slot.style.color = 'rgba(0,0,0,0.2)';
        slot.style.fontSize = '30px';
        slot.style.lineHeight = '96px';
        slot.style.textAlign = 'center';

        foundationSlots.push(slot);
    });

    // Guarda la lista de slots
    uiRefs.foundationSlots = foundationSlots;

    const foundationArea = mk('div', {
        className: 'foundation-area',
        children: foundationSlots
    });

    const topSection = mk('div', {
        className: 'top-section',
        children: [deckArea, foundationArea]
    });

    // C. Tableau (columnas)
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
            cardEl.dataset.zone = 'tableau'; //Marca la zona

            domCol.appendChild(cardEl);
        });
    });
}

function renderDeck(game, slotDOM) {
    if (!slotDOM) return;
    slotDOM.innerHTML = '';

    if (game.deck.length > 0) {
        // Crea div manual con el estilo del dorso
        const deckCard = mk('div', { className: ['card', 'back'] });
        deckCard.style.backgroundImage = `url(${SPRITE_CONFIG.url})`;
        deckCard.style.backgroundRepeat = 'no-repeat';

        // Coordenadas del dorso (mismas que en createCardElement)
        const backY = 4 * SPRITE_CONFIG.height;
        deckCard.style.backgroundPosition = `0px -${backY}px`;

        slotDOM.appendChild(deckCard);
    }
}

function renderWaste(game, slotDOM) {
    if (!slotDOM) return;
    slotDOM.innerHTML = '';

    if (game.waste.length > 0) {
        // Muestra solo la ultima carta del descarte
        // (en el futuro podria mostrar las ultimas 3 en abanico estilo windows)
        const topCard = game.waste[game.waste.length - 1];
        const cardEl = createCardElement(topCard);
        cardEl.style.position = 'static';
        cardEl.dataset.zone = 'waste';
        slotDOM.appendChild(cardEl);
    }
}

function renderFoundations(game, slotsDOM) {
    // Recorre los 4 palos
    SUITS.forEach((suit, index) => {
        const pile = game.foundations[suit];
        const slotDOM = slotsDOM[index]; // Asume orden DOM coindice con SUITS

        // Limpia (borra el simbolo de fondo si hay carta, o actualiza la carta anterior)
        slotDOM.innerHTML = '';

        if (pile.length === 0) {
            // Si vacio, pone el simbolo gris clarito de fondo de nuevo
            slotDOM.textContent = suit;
            slotDOM.style.color = 'rgba(0,0,0,0.2)';
            slotDOM.style.fontSize = '30px';
            slotDOM.style.lineHeight = '96px';
            slotDOM.style.textAlign = 'center';
        } else{
            // Si hay carta, muestra la ultima
            const topCard = pile[pile.length - 1];
            const cardEl = createCardElement(topCard);
            // Saca posicion absoluta para que encaje en el slot
            cardEl.style.position = 'static';
            slotDOM.appendChild(cardEl);
        }
    });
}

// Config del sprite
const SPRITE_CONFIG = {
    url: 'src/os/apps/solitaire/cards.png',
    width: 71,
    height: 96,
    suitOrder: ['♠', '♥', '♣', '♦']
};

function createCardElement(card) {
    const el = mk('div', { className: 'card' });

    // Imagen base
    el.style.backgroundImage = `url(${SPRITE_CONFIG.url})`;
    el.style.backgroundRepeat = 'no-repeat';

    if (!card.faceUp) {
        // Carta boca abajo
        const backX = 0;
        const backY = 4 * SPRITE_CONFIG.height; // Fila 4
        
        el.style.backgroundPosition = `-${backX}px -${backY}px`;
        el.classList.add('back');
        return el;
    }

    // Carta boca arriba
    // 1. Calcular X basado en el numero (A, 2, 3...)
    const rankIndex = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(card.rank);
    const x = rankIndex * SPRITE_CONFIG.width;

    // 2. Calcular Y basado en el palo
    const suitIndex = SPRITE_CONFIG.suitOrder.indexOf(card.suit);
    const y = suitIndex * SPRITE_CONFIG.height;

    // Mover la imagen para mostrar slo ese pedazo
    el.style.backgroundPosition = `-${x}px -${y}px`;

    // debug
    el.classList.add(card.color);

    return el;
}

// Fisica y drag & drop

function setupDragEvents(boardElement) {
    // Click en el mazo
    // Usando el ID stock-slot para detectar clicks en el mazo
    boardElement.addEventListener('click', (e) => {
        // Si clickeo en el mazo..
        if (e.target.id === 'stock-slot' || e.target.closest('#stock-slot')) {
            gameInstance.drawCard();
            renderDeck(gameInstance, uiRefs.stockSlot);
            renderWaste(gameInstance, uiRefs.wasteSlot);

            checkGameStatus();
        }
    });

    // Mousedown: aggarra carta(s)
    boardElement.addEventListener('mousedown', (e) => {
        const cardEl = e.target.closest('.card');
        // Solo arrastra si es carta, no esta boca abajo, y no esta ya arrastrando
        if (!cardEl || cardEl.classList.contains('back') || dragState.isDragging) return;
        
        if (cardEl.parentElement.classList.contains('slot') && cardEl.dataset.zone !== 'waste') {
            return;
        }
        
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

    // Detectar origen
    const zone = cardEl.dataset.zone; // tableau o waste

    if (zone === 'tableau') {
        dragState.originType = 'tableau';
        dragState.originCol = parseInt(cardEl.dataset.col);
        dragState.originIndex = parseInt(cardEl.dataset.index);

        const colContainer = uiRefs.tableauCols[dragState.originCol];
        const allCards = Array.from(colContainer.children);
        dragState.cards = allCards.slice(dragState.originIndex);
    } else if (zone === 'waste') {
        dragState.originType = 'waste';
        dragState.cards = [cardEl]; // Solo se puede mover una carta del waste
    }

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
    dragState.cards.forEach((card, index) => {
        const currentLeft = parseFloat(card.style.left);
        const currentTop = parseFloat(card.style.top);
        card.style.left = (currentLeft + e.movementX) + 'px';
        card.style.top = (currentTop + e.movementY) + 'px';
    });
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
        // Caso 1: Viene del tableau
        if (dragState.originType === 'tableau') {
            if (dropTarget.type === 'tableau') {
                moveSuccessful = gameInstance.moveTableauToTableau(
                    dragState.originCol, dropTarget.col, dragState.originIndex
                );
            } else if (dropTarget.type === 'foundation' && dragState.cards.length === 1) {
                moveSuccessful = gameInstance.moveTableauToFoundation(
                    dragState.originCol, dropTarget.foundationIdx
                );
            }
        }
        // Caso 2: Viene del waste
        else if (dragState.originType === 'waste') {
            if (dropTarget.type === 'tableau') {
                moveSuccessful = gameInstance.moveWasteToTableau(dropTarget.col);
            } else if(dropTarget.type === 'foundation') {
                moveSuccessful = gameInstance.moveWasteToFoundation(dropTarget.foundationIdx);
            }
        }
    }

    // Renderizar (o snap back si fallo)
    renderTableau(gameInstance, uiRefs.tableauCols);
    renderFoundations(gameInstance, uiRefs.foundationSlots);
    renderWaste(gameInstance, uiRefs.wasteSlot); // Refrescar waste tambien

    dragState.cards = [];

    if (moveSuccessful) {
        checkGameStatus();
    }
}

/**
 * Detecta donde cae el mouse (Columna, fundacion)
 */
function getDropTarget(x, y) {
    // Busca elemento bajo el mouse
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // 1. Es columna?
    const colElement = element.closest('.tableau-col');
    if (colElement) {
        return { type: 'tableau', col: parseInt(colElement.dataset.col) };
    }

    // 2. Es fundacion?
    // Puede q se haya soltado sobre un slot vacio o sobre una carta
    const slotElement = element.closest('.foundation-area .slot');
    if (slotElement) {
        return { type: 'foundation', foundationIdx: parseInt(slotElement.dataset.foundation) };
    }

    return null;
}

// WIn / Lost system

function checkGameStatus() {
    const status = gameInstance.checkGameState();

    if (status === 'WIN') {
        showModal('Victory!', 'Congratulations! You have won.');
    } else if (status === 'LOSS') {
        showModal('Game Over', 'No more moves available.');
    }
}

function showModal(title, message) {
    if (document.querySelector('.solitaire-modal-overlay')) return;

    const overlay = mk('div', { className: 'solitaire-modal-overlay' });
    const modal = mk('div', { className: 'solitaire-modal' });

    const header = mk('div', { className: 'modal-header', text: title });
    const body = mk('div', { className: 'modal-body', text: message });

    const btn = mk('button', {
        className: 'modal-btn',
        text: 'Play Again',
        events: {
            click: () => {
                restartGame();
                overlay.remove();
            }
        }
    });

    body.appendChild(mk('br', {}));
    body.appendChild(btn);

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    uiRefs.board.appendChild(overlay);
}

function restartGame() {
    gameInstance = new SolitaireEngine();
    gameInstance.initGame();
    renderAll();
    console.log('Game Restarted');
}
