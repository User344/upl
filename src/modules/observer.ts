import { Once } from "src/utils/once"

type ObserverCallback = (element: Element) => void

type Entry = {
    selector: string,
    callback: ObserverCallback
}

let _observer: MutationObserver | undefined
const _initOnce = new Once(init)
const _entriesCreation: Entry[] = []
const _entriesDeletion: Entry[] = []

// Because Riot sometimes overrides 'matches' method...
function matches(element: Element, selector: string) {
    return Element.prototype.matches.call(element, selector)
}

function observerHandleElement(element: Element, isNew: boolean) {
    if (isNew) {
        for (const entry of _entriesCreation) {
            if (matches(element, entry.selector)) {
                entry.callback(element)
            }
        }
    } else {
        for (const entry of _entriesDeletion) {
            if (matches(element, entry.selector)) {
                entry.callback(element)
            }
        }
    }

    for (const child of element.children) {
        observerHandleElement(child, isNew)
    }

    if (element.shadowRoot != null) {
        for (const child of element.shadowRoot.children) {
            observerHandleElement(child, isNew)
        }

        if (isNew) {
            _observer!.observe(element.shadowRoot, { attributes: false, childList: true, subtree: true })
        }
    }
}

function observerCallback(mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                observerHandleElement((node as Element), true)
            }
        }

        for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                observerHandleElement((node as Element), false)
            }
        }
    }
}

function init() {
    _observer = new MutationObserver(observerCallback)
    _observer!.observe(document, { attributes: false, childList: true, subtree: true })
}

/**
 * Subscribe to element creation.
 * @param selector [CSS Selector]{@link https://www.w3schools.com/jsref/met_document_queryselector.asp}.
 * @param callback Fired when element matching {@link selector} is created.
 */
export function subscribeToElementCreation(selector: string, callback: ObserverCallback) {
    _initOnce.trigger()
    _entriesCreation.push({ selector: selector, callback: callback })
}

/**
 * Exactly same as {@link subscribeToElementCreation} except {@link callback} is called
 * when element is deleted.
 */
export function subscribeToElementDeletion(selector: string, callback: ObserverCallback) {
    _initOnce.trigger()
    _entriesDeletion.push({ selector: selector, callback: callback })
}

// LOAD CALLBACK

let loadCallbacks: (() => void)[] = []
let loadInitialized: boolean = false
let loadedOnce: boolean = false

/**
 * Subscribe to load.
 * @param callback Fired when league's loading screen fades away.
 */
export function subscribeToLoad(callback: () => void) {
    if (!loadInitialized) {
        loadInitialized = true

        subscribeToElementDeletion('.lol-loading-screen-container', () => {
            if (loadedOnce) {
                return
            }
            loadedOnce = true

            for (let callback of loadCallbacks) {
                callback()
            }
        })
    }
    loadCallbacks.push(callback)
}
