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

let _xhrHookMap: { [id: string]: XhrHookEntry } = {}
const _initOnce = new Once(init)

/**
 * Hook an XHR request.
 * @param callback Called _BEFORE_ request is sent, allowing you to modify request.
 */
export function hookPre(path: string, callback: ResourceHookPreCallback) {
    _initOnce.trigger()

    var entry = _xhrHookMap[path]
    if (entry === undefined) {
        _xhrHookMap[path] = { pre_callback: callback, post_callback: undefined }
    } else {
        _xhrHookMap[path].pre_callback = callback
    }
}

/**
 * Hook an XHR request.
 * @param callback Called _AFTER_ request is sent, allowing you to modify request.
 */
export function hookPost(path: string, callback: ResourceHookPostCallback) {
    _initOnce.trigger()

    var entry = _xhrHookMap[path]
    if (entry === undefined) {
        _xhrHookMap[path] = { pre_callback: undefined, post_callback: callback }
    } else {
        _xhrHookMap[path].post_callback = callback
    }
}

/**
 * Hook a text XHR request.
 * @param callback Called _BEFORE_ request is sent, allowing you to modify request.
 */
export function hookTextPre(path: string, callback: ResourceHookTextCallback) {
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
 * @param callback Called _AFTER_ request is sent, allowing you to modify request.
 */
export function hookTextPost(path: string, callback: ResourceHookTextCallback) {
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
    var entry = _xhrHookMap[url.toString()]

    if (entry !== undefined) {
        let originalSend = this.send

        // console.log('found entry')
        // debugger

        this.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
            if (body instanceof Document) {
                return originalSend.apply(this, [body])
            }

            if (entry.post_callback !== undefined) {
                let originalOnReadyStateChanged = this.onreadystatechange
                this.onreadystatechange = function(ev: Event) {
                    if (this.readyState === 4 && entry.post_callback !== undefined) {
                        let original = () => {
                            originalOnReadyStateChanged!.apply(this, [ev])
                        }

                        entry.post_callback(this, original)
                        return
                    }

                    // @ts-ignore
                    return originalOnReadyStateChanged.apply(this, arguments);
                };
            }

            if (entry.pre_callback !== undefined) {
                let original = (content: XMLHttpRequestBodyInit | null) => {
                    body = content
                    originalSend.apply(this, [body]);
                }

                // need to do || null because otherwise typescript is tripping trying to
                // convert undefined to null (where did null come from???)
                entry.pre_callback(this, body || null, original)
            } else {
                originalSend.apply(this, [body]);
            }
        };
    }

    // @ts-ignore
    _xhrOriginalOpen.apply(this, arguments);
}

function init() {
    XMLHttpRequest.prototype.open = hookedOpen;
}

