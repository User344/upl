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

const _entriesText = new Map<string, XhrHookEntry>()
const _entriesRegex: (readonly [RegExp, XhrHookEntry])[] = []
const _initOnce = new Once(init)

/**
 * Hook an XHR request.
 * A string hook always takes precedence over a regex hook, even if the regex matches the string.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _BEFORE_ request is sent, allowing you to modify request.
 */
export function hookPre(path: string | RegExp, callback: ResourceHookPreCallback) {
    _initOnce.trigger()

    if (typeof path === 'string') {
        var entry = _entriesText[path]
        if (entry === undefined) {
            _entriesText[path] = { pre_callback: callback, post_callback: undefined }
        } else {
            _entriesText[path].pre_callback = callback
        }
    } else if (path instanceof RegExp) {
        var index = _entriesRegex.findIndex(x => x[0] == path);
        if (index === -1) {
            _entriesRegex.push([path, { pre_callback: callback, post_callback: undefined }])
        } else {
            _entriesRegex[index][1].pre_callback = callback
        }
    } else {
        throw new TypeError('Invalid path type!')
    }
}

/**
 * Hook an XHR request.
 * A string hook always takes precedence over a regex hook, even if the regex matches the string.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _AFTER_ request is sent, allowing you to modify response.
 */
export function hookPost(path: string | RegExp, callback: ResourceHookPostCallback) {
    _initOnce.trigger()

    if (typeof path === 'string') {
        var entry = _entriesText[path]
        if (entry === undefined) {
            _entriesText[path] = { pre_callback: undefined, post_callback: callback }
        } else {
            _entriesText[path].post_callback = callback
        }
    } else if (path instanceof RegExp) {
        var index = _entriesRegex.findIndex(x => x[0] == path);
        if (index === -1) {
            _entriesRegex.push([path, { pre_callback: undefined, post_callback: callback }])
        } else {
            _entriesRegex[index][1].post_callback = callback
        }
    } else {
        throw new TypeError('Invalid path type!')
    }
}

/**
 * Hook a text XHR request.
 * A string hook always takes precedence over a regex hook, even if the regex matches the string.
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
 * A string hook always takes precedence over a regex hook, even if the regex matches the string.
 * @param path A string (exact match) or a regex pattern.
 * @param callback Called _AFTER_ request is sent, allowing you to modify response.
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
    let urlStr = url.toString()
    var entry = _entriesText.get(urlStr)

    if (entry === undefined && _entriesRegex.length > 0) {
        entry = _entriesRegex.find(x => x[0].test(urlStr))?.[1];
    }

    if (entry !== undefined) {
        let originalSend = this.send

        this.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
            if (body instanceof Document) {
                return originalSend.apply(this, [body])
            }

            if (entry!.post_callback !== undefined) {
                let originalOnReadyStateChanged = this.onreadystatechange
                this.onreadystatechange = function(ev: Event) {
                    if (this.readyState === 4 && entry!.post_callback !== undefined) {
                        let original = () => {
                            originalOnReadyStateChanged!.apply(this, [ev])
                        }

                        entry!.post_callback(this, original)
                        return
                    }

                    // @ts-ignore
                    return originalOnReadyStateChanged.apply(this, arguments);
                };
            }

            if (entry!.pre_callback !== undefined) {
                let original = (content: XMLHttpRequestBodyInit | null) => {
                    body = content
                    originalSend.apply(this, [body]);
                }

                entry!.pre_callback(this, body || null, original)
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

