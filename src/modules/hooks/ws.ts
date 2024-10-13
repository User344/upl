import { Core } from 'src/core'
import { Once } from 'src/utils/once'
import * as ws from 'src/modules/ws'

export type WebSocketMessageHookOriginal = (payload: string) => void
export type WebSocketMessageHookCallback = (endpoint: string, payload: string, original: WebSocketMessageHookOriginal) => void

export type WebSocketEventHookOriginal = (data: any) => void
export type WebSocketEventHookCallback = (endpoint: string, data: any, original: WebSocketEventHookOriginal) => void

const _entriesMessageText = new Map<string, WebSocketMessageHookCallback>()
const _entriesMessageRegex: (readonly [RegExp, WebSocketMessageHookCallback])[] = []
const _once = new Once(init)

/**
 * Hook a websocket message endpoint.
 */
export function hookMessage(endpoint: string | RegExp, callback: WebSocketMessageHookCallback) {
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
 * Hook a websocket event endpoint.
 */
export function hookEvent(endpoint: string | RegExp, callback: WebSocketEventHookCallback) {
    hookMessage(endpoint, (_endpoint, payload, original) => {
        let payloadObject = JSON.parse(payload)

        let _original = (newPayload: any) => {
            payloadObject[2].data = newPayload
            original(JSON.stringify(payloadObject))
        }

        callback(_endpoint, payloadObject[2].data, _original)
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

        return entry(endpoint, payload, original)
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
