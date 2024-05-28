import { Once } from 'src/utils/once'

// NOTE: WORK IN PROGRESS!

type HookPreOriginal = (input: string | URL, init: RequestInit | undefined) => void
type HookPostOriginal = (response: Response) => void

type HookPreCallback = (input: string | URL, init: RequestInit | undefined, original: HookPreOriginal) => void
type HookPostCallback = (response: Response, original: HookPostOriginal) => void

type HookTextPreOriginal = (body: string | undefined) => void
type HookTextPostOriginal = (body: string) => void

type HookTextPreCallback = (body: string | undefined, original: HookTextPreOriginal) => void
type HookTextPostCallback = (response: string, original: HookTextPostOriginal) => void

interface HookEntry {
    pre_callback: HookPreCallback[]
    post_callback: HookPostCallback[]
}

const _entries = new Map<string | URL, HookEntry>()
const _initOnce = new Once(init)

export function hookPre(endpoint: string | URL, callback: HookPreCallback) {
    _initOnce.trigger()

    let entry = _entries.get(endpoint)
    if (entry === undefined) {
        entry = { pre_callback: [callback], post_callback: [] }
        _entries.set(endpoint, entry)
    } else {
        entry.pre_callback.push(callback)
    }
}

export function hookPost(endpoint: string | URL, callback: HookPostCallback) {
    _initOnce.trigger()

    let entry = _entries.get(endpoint)
    if (entry === undefined) {
        entry = { pre_callback: [], post_callback: [callback] }
        _entries.set(endpoint, entry)
    } else {
        entry.post_callback.push(callback)
    }
}

export function hookTextPre(endpoint: string | URL, callback: HookTextPreCallback) {
    hookPre(endpoint, (input, init, original) => {
        if (typeof init?.body !== 'string') {
            console.error('UPL: Tried to hook text fetch request but body is not a string!')
            return original(input, init)
        }

        const _original = (newBody: string | undefined) => {
            if (newBody !== undefined) {
                if (init !== undefined) {
                    init.body = newBody
                } else {
                    init = {
                        body: newBody
                    }
                }
            }

            original(input, init)
        }

        callback(init?.body, _original)
    })
}

export function hookTextPost(endpoint: string | URL, callback: HookTextPostCallback) {
    hookPost(endpoint, (response, original) => {
        const originalText = response.text

        debugger
        response.text = function() {
            return new Promise((resolve, reject) => {
                originalText.apply(this).then(originalResponseText => {
                    let responseText = originalResponseText

                    const __original = (newBody: string) => {
                        resolve(newBody)
                    }

                    callback(responseText, __original)
                }).catch((error) => {
                    reject(error)
                })
            })
        }

        original(response)
    })
}

const _originalFetch = window.fetch
function hookedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (input instanceof Request) {
        return _originalFetch(input, init)
    }

    const entry = _entries.get(input)
    if (entry === undefined) {
        return _originalFetch(input, init)
    }

    return new Promise((resolve, reject) => {
        const original = (_input: string | URL, _init: RequestInit | undefined) => {
            input = _input
            init = _init
        }

        for (const callback of entry.pre_callback) {
            callback(<string | URL>input, init, original)
        }

        _originalFetch(input, init)
            .then(async response => {
                let counter = 0

                // FIXME: Regression possible if we dont copy post_callbacks locally

                const original = () => {
                    if (++counter >= entry.post_callback.length) {
                        resolve(response)
                    }
                }

                for (const callback of entry.post_callback) {
                    callback(response.clone(), original)
                }
            })
            .catch(reason => {
                reject(reason)
            })
    })
}

function init() {
    window.fetch = hookedFetch
}
