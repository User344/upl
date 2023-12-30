type ObserverCallback = (element: Element) => void
type DocumentObserverMap = { [key: string] : [ObserverCallback] }

type ObserverCallbackList = {
    idCallbacks: DocumentObserverMap
    tagCallbacks: DocumentObserverMap
    classCallbacks: DocumentObserverMap
}

let observerObject: MutationObserver | undefined
let observerCreationCallbacks: ObserverCallbackList = { idCallbacks: {}, tagCallbacks: {}, classCallbacks: {} }
let observerDeletionCallbacks: ObserverCallbackList = { idCallbacks: {}, tagCallbacks: {}, classCallbacks: {} }

function observerHandleElement(element: Element, isNew: boolean, callbacks: ObserverCallbackList) {
    if (element.id != '') {
        const cb = callbacks.idCallbacks[element.id]
        if (cb != undefined) {
            for (const obj of cb) {
                obj(element)
            }
        }
    }

    const tagLowered = element.tagName.toLowerCase()
    const cb = callbacks.tagCallbacks[tagLowered];
    if (cb != undefined) {
        for (const obj of cb) {
            obj(element)
        }
    }

    const classList = element.classList
    if (classList) {
        for (const nodeClass of classList) {
            const classLowered = nodeClass.toLowerCase()
            const cb = callbacks.classCallbacks[classLowered]
            if (cb != undefined) {
                for (const obj of cb) {
                    obj(element)
                }
            }
        }
    }

    for (const child of element.children) {
        observerHandleElement(child, isNew, callbacks)
    }

    if (element.shadowRoot != null) {
        for (const child of element.shadowRoot.children) {
            observerHandleElement(child, isNew, callbacks)
        }

        if (isNew) {
            observerObject!.observe(element.shadowRoot, { attributes: false, childList: true, subtree: true })
        }
    }
}

function observerCallback(mutationsList: MutationRecord[]) {
    for (const mutation of mutationsList) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                observerHandleElement((node as Element), true, observerCreationCallbacks)
            }
        }

        for (const node of mutation.removedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                observerHandleElement((node as Element), false, observerDeletionCallbacks)
            }
        }
    }
}

function ensureObserver() {
	if (observerObject != undefined) {
		return
	}

	observerObject = new MutationObserver(observerCallback)
	observerObject!.observe(document, { attributes: false, childList: true, subtree: true })
}

function observerSubscribeToElement(target: string, callback: ObserverCallback, callbackList: ObserverCallbackList) {
    function push(target: string, callback: ObserverCallback, observerMap: DocumentObserverMap) {
        let v = observerMap[target]

        if (v === undefined) {
            observerMap[target] = [ callback ]
        } else {
            v.push(callback)
        }
    }

    if (target[0] === '.') {
        push(target.slice(1), callback, callbackList.classCallbacks)
    } else if (target[0] === '#') {
        push(target.slice(1), callback, callbackList.idCallbacks)
    } else {
        push(target, callback, callbackList.tagCallbacks)
    }
}

/**
 * Subscribe to element creation.
 * Fires {@link callback} when element matching {@link target} is created.
 * @param target Follows [querySelector]{@link https://www.w3schools.com/jsref/met_document_queryselector.asp}-ish style of selector,
 * except very naive one. Only supports class, id and tag syntax right now.
 */
export function subscribeToElementCreation(target: string, callback: ObserverCallback) {
	ensureObserver()
    observerSubscribeToElement(target, callback, observerCreationCallbacks)
}

/**
 * Exactly same as {@link subscribeToElementCreation} except {@link callback} is called
 * when element is deleted.
 */
export function subscribeToElementDeletion(target: string, callback: ObserverCallback) {
	ensureObserver()
    observerSubscribeToElement(target, callback, observerDeletionCallbacks)
}

// LOAD CALLBACK

let loadCallbacks: (() => void)[] = []
let loadInitialized: boolean = false
let loadedOnce: boolean = false

/**
 * Subscribe to load.
 * Fires {@link callback} whenever league's loading screen fades away. 
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
