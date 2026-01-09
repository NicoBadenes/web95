/**
 * @file src/os/utils/dom.js
 * @description Utilidades de bajo nivel para la manipulación del DOM.
 */

/**
 * Crea un elemento DOM con configuraciónes detalladas.
 * @param {string} tag
 * @param {Object} [options]
 * @returns {HTMLElement}
 */
export function mk(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;

    if (options.className) {
        if (Array.isArray(options.className)) {
            element.classList.add(...options.className);
        } else{
            element.classList.add(options.className);
        }
    }

    if (options.text) element.textContent = options.text;

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)){
            element.setAttribute(key, value);
        }
    }

    if (options.events) {
        for (const[eventType, handler] of Object.entries(options.events)){
            element.addEventListener(eventType, handler);
        }
    }

    if (options.children){
        const fragment = document.createDocumentFragment();
        options.children.forEach(child => {
            if (child instanceof Node) fragment.appendChild(child);
        });
        element.appendChild(fragment);
    }

    return element;

    }

    /**
     * Selecciona un elemento del DOM.
     */
    export function $(selector) {
        return document.querySelector(selector);
}