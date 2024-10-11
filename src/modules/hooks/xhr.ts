import { Once } from 'src/utils/once'

// TODO: Support multiple hooks on the same path.

type ResourceHookPreOriginal = (body: XMLHttpRequestBodyInit | null) => void
type ResourceHookPreCallback = (request: XMLHttpRequest, body: XMLHttpRequestBodyInit | null, original: ResourceHookPreOriginal) => void

type ResourceHookPostOriginal = () => void
type ResourceHookPostCallback = (request: XMLHttpRequest, original: ResourceHookPostOriginal) => void

type ResourceHookTextOriginal = (response: string) => void
type ResourceHookTextCallback = (body: string, original: ResourceHookTextOriginal) => void

interface XhrHookEntry {
    pre_callback: ResourceHookPreCallback | undefined
    post_callback: ResourceHookPostCallback | undefined
}

type _xhrHookMapEntry = { pattern: RegExp; entry: XhrHookEntry };
let _xhrHookMap: _xhrHookMapEntry[] = [];
const _initOnce = new Once(init)

/**
 * Hook an XHR request.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _BEFORE_ request is sent, allowing you to modify request.
 */
export function hookPre(path: string | RegExp, callback: ResourceHookPreCallback) {
    _initOnce.trigger()

    let pattern: RegExp;
    if (typeof path === 'string') {
        pattern = new RegExp(`^${path}$`);
    } else {
        pattern = path;
    }

    const existingEntry = _xhrHookMap.find(entry => entry.pattern.source === pattern.source);
    if (existingEntry) {
        existingEntry.entry.pre_callback = callback;
    } else {
        _xhrHookMap.push({ pattern, entry: { pre_callback: callback, post_callback: undefined } });
    }
}

/**
 * Hook an XHR request.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _AFTER_ request is sent, allowing you to modify request.
 */
export function hookPost(path: string | RegExp, callback: ResourceHookPostCallback) {
    _initOnce.trigger()

    let pattern: RegExp;
    if (typeof path === 'string') {
        pattern = new RegExp(`^${path}$`);
    } else {
        pattern = path;
    }

    const existingEntry = _xhrHookMap.find(entry => entry.pattern.source === pattern.source);
    if (existingEntry) {
        existingEntry.entry.post_callback = callback;
    } else {
        _xhrHookMap.push({ pattern, entry: { pre_callback: undefined, post_callback: callback } });
    }
}

/**
 * Hook a text XHR request.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _BEFORE_ request is sent, allowing you to modify request.
 */
export function hookTextPre(path: string | RegExp, callback: ResourceHookTextCallback) {
    hookPre(path, (_, body, original) => {
        if (typeof body !== 'string') {
            console.error('UPL: Tried to hook text XHR request but body is not a string!')
            return original(body)
        }

        const _original = (newBody: string) => {
            original(newBody)
        }

        callback(body, _original)
    })
}

/**
 * Hook a text XHR request.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _AFTER_ request is sent, allowing you to modify request.
 */
export function hookTextPost(path: string | RegExp, callback: ResourceHookTextCallback) {
    hookPost(path, (request, original) => {
        if (request.responseType !== '' && request.responseType !== 'text') {
            console.error('UPL: Tried to hook text XHR request but response is not a string!')
            return original()
        }

        const _original = (response: string) => {
            if (request.responseText != response) {
                Object.defineProperty(request, 'responseText', {
                    writable: true,
                    value: response
                });
            }

            original()
        }

        callback(this.responseText, _original)
    })
}

const _xhrOriginalOpen = XMLHttpRequest.prototype.open;
function hookedOpen(_: string, url: string | URL) {
    const urlString = url.toString();

    let matchedEntry: XhrHookEntry | undefined = undefined;
    for (const { pattern, entry } of _xhrHookMap) {
        if (pattern.test(urlString)) {
            matchedEntry = entry;
            break;
        }
    }

    if (matchedEntry !== undefined) {
        let originalSend = this.send

        // console.log('found entry ${url}')

        this.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
            if (body instanceof Document) {
                return originalSend.apply(this, [body])
            }

            if (matchedEntry.pre_callback !== undefined) {
                let original = (content: XMLHttpRequestBodyInit | null) => {
                    body = content
                }

                // need to do || null because otherwise typescript is tripping trying to
                // convert undefined to null (where did null come from???)
                matchedEntry.pre_callback(this, body || null, original)
            }

            if (matchedEntry.post_callback !== undefined) {
                let originalOnReadyStateChanged = this.onreadystatechange
                this.onreadystatechange = function(ev: Event) {
                    if (this.readyState === 4 && matchedEntry.post_callback !== undefined) {
                        let original = () => {
                            originalOnReadyStateChanged!.apply(this, [ev])
                        }

                        matchedEntry.post_callback(this, original)
                        return
                    }

                    // @ts-ignore
                    return originalOnReadyStateChanged.apply(this, arguments);
                };
            }

            originalSend.apply(this, [body]);
        };
    }

    // @ts-ignore
    _xhrOriginalOpen.apply(this, arguments);
}

function init() {
    XMLHttpRequest.prototype.open = hookedOpen;
}

