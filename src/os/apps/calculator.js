/**
 * @file src/os/apps/calculator.js
 * @description Calculadora estandar con diseño Grid y logica aritmetica basica.
 */

import { mk } from '../../utils/dom.js';
import { audio } from '../../utils/audio.js';

class CalculatorApp {
    constructor() {
        this.displayValue = '0';
        this.firstOperand = null;
        this.waitingForSecondOperand = false;
        this.operator = null;
        this.displayElement = null;
    }

    run() {
        // 1. Pantalla
        this.displayElement = mk('div', {
            className: 'calc-display',
            text: '0'
        });

        // 2. Definicion de botones
        const keys = [
            // Fila 1
            { text: 'C', type: 'clear', color: 'btn-red' },
            { text: '/', type: 'operator', color: 'btn-red' },
            { text: '*', type: 'operator', color: 'btn-red' },
            { text: '-', type: 'operator', color: 'btn-red' },
            // Fila 2
            { text: '7', type: 'digit' },
            { text: '8', type: 'digit' },
            { text: '9', type: 'digit' },
            { text: '+', type: 'operator', color: 'btn-red', style: 'grid-row: span 2; height: 100%' },
            // Fila 3
            { text: '4', type: 'digit' },
            { text: '5', type: 'digit' },
            { text: '6', type: 'digit' },
            
            // Ajuste para Gird 4x5 estandar
            { text: '1', type: 'digit' },
            { text: '2', type: 'digit' },
            { text: '3', type: 'digit' },
            { text: '=', type: 'equal', style: 'grid-row: span 2; height: 100%; background-color: var(--clr-blue-dark); color: white;' },
            // Fila 0
            { text: '0', type: 'digit', style: 'grid-column: span 2; width: 100%' },
            { text: '.', type: 'decimal' }
        ];
        
        // Correcion visual del layout para que el + y el = calcen bien
        // Layout plano por ahora para facilitar la escritura manual
        
        const keysContainer = mk('div', { className: 'calc-keys' });

        keys.forEach(key => {
            const btn = mk('button', {
                 // className: `calc-btn ${key.color || ''}`, //DA ERROR
                
                text: key.text,

                attributes: { 
                    style: key.style || '',
                    'class': `calc-btn ${key.color || ''}`.trim()
                },
                
                events: {
                    click: () => this.handleInput(key)
                }
            });
            keysContainer.appendChild(btn);
        });

        // 3. Contenedor Principal
        return mk('div', {
            className: 'app-calculator',
            children: [this.displayElement, keysContainer]
        });
    }   

    handleInput(key) {
        const { type, text } = key;

        if (type === 'digit') {
            this.inputDigit(text);
        } else if (type === 'operator') {
            this.handleOperator(text);
        } else if (type === 'equal') {
            this.handleEqual();
        } else if (type === 'clear') {
            this.reset();
        } else if (type === 'decimal') {
            this.inputDecimal();
        }

        this.updateDisplay();
    }

    inputDigit(digit) {
        if (this.waitingForSecondOperand) {
            this.displayValue = digit;
            this.waitingForSecondOperand = false;
        } else{
            this.displayValue = this.displayValue === '0' ? digit : this.displayValue + digit;
        }
    } 
    
    inputDecimal () {
        if (!this.displayValue.includes('.')) {
            this.displayValue += '.';
        }
    }

    handleOperator(nextOperator) {
        const inputValue = parseFloat(this.displayValue);

        if(this.operator && this.waitingForSecondOperand) {
            this.operator = nextOperator;
            return;
        }

        if(this.firstOperand == null) {
            this.firstOperand = inputValue;
        } else if(this.operator) {
            const result = this.calculate(this.firstOperand, inputValue, this.operator);
            this.displayValue = String(result);
            this.firstOperand = result;
        }

        this.waitingForSecondOperand = true;
        this.operator = nextOperator;
    }

    handleEqual() {
        if(!this.operator || this.firstOperand == null) return;

        const inputValue = parseFloat(this.displayValue);
        const result = this.calculate(this.firstOperand, inputValue, this.operator);

        this.displayValue = String(result);
        this.firstOperand = null;
        this.operator = null;
        this.waitingForSecondOperand = true;
    }

    calculate(first, second, op) {
        if (op === '/' && second === 0) {
            if(audio && audio.playError) audio.playError(); //Bip de error
            return 'Error';
        }
        switch (op) {
            case '+': return first + second;
            case '-': return first - second;
            case '*': return first * second;
            case '/': return first / second;
            default: return second;
        }
    }

    reset() {
        this.displayValue = '0';
        this.firstOperand = null;
        this.waitingForSecondOperand = false;
        this.operator = null;
    }

    updateDisplay() {
        if (this.displayElement) {
            this.displayElement.innerText = this.displayValue.substring(0, 12);
        }
    }
}

export const calculator = new CalculatorApp();