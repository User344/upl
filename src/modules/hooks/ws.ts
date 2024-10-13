import { Core } from 'src/core'
import { Once } from 'src/utils/once'
import * as ws from 'src/modules/ws'

export type WebSocketHookOriginal = (content: any) => void
export type WebSocketHookCallback = (content: any, original: WebSocketHookOriginal) => void

export type WebSocketTextHookOriginal = (content: string) => void
export type WebSocketTextHookCallback = (content: string, original: WebSocketTextHookOriginal) => void

const _entriesMessageText = new Map<string, WebSocketHookCallback>()
const _entriesMessageRegex: (readonly [RegExp, WebSocketHookCallback])[] = []
const _once = new Once(init)

/**
 * Hook a websocket endpoint.
 */
export function hook(endpoint: string | RegExp, callback: WebSocketHookCallback) {
    _once.trigger()

    if (typeof endpoint === 'string') {
        _entriesMessageText[endpoint] = callback
    } else if (endpoint instanceof RegExp) {
        _entriesMessageRegex.push([endpoint, callback])
    } else {
        throw new TypeError('Invalid endpoint type!')
    }
}

/**
 * Hook a websocket text endpoint.
 */
export function hookText(endpoint: string, callback: WebSocketTextHookCallback) {
    hook(endpoint, (content, original) => {
        if (typeof content !== 'string') {
            console.error('UPL: Tried to hook text websocket endpoint but content is not a string!')
            return original(content)
        }

        const _original = (newContent: string) => {
            original(newContent)
        }

        callback(content, _original)
    })
}

function initHook(prCtx: any) {
    let _publishMethod = prCtx.socket._dispatcher.publish
        .bind(prCtx.socket._dispatcher) as ws.PublishMethod;

    // Set publish method of WS module to original,
    // so it doesn't call our hook instead.
    ws.setPublishMethod(_publishMethod)

    prCtx.socket._dispatcher.publish = function(endpoint: string, payload: string) {
        let entry = _entriesMessageText.get(endpoint)

        if (entry === undefined) {
            entry = _entriesMessageRegex.find(x => x[0].test(endpoint))?.[1];

            if (entry === undefined) {
                return _publishMethod(endpoint, payload)
            }
        }

        let original = (content: any) => {
            _publishMethod(endpoint, content)
        }

        return entry(payload, original)
    }
}

function init() {
    if (Core === undefined) {
        throw new Error("UPL is not initialized!")
    }

    let prCtx = Core.PluginRunnerContext

    if (prCtx !== undefined) {
        initHook(prCtx)
    } else {
        Core.PluginRunnerContextAwaiters.push((ctx) => {
            initHook(ctx)
        })
    }
}
