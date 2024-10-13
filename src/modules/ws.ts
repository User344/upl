import { Core } from 'src/core'
import { Once } from 'src/utils/once'

/** @internal */
export type PublishMethod = (endpoint: string, payload: string) => void

let _once = new Once(init)
let _publishMethod: PublishMethod | undefined

/** @internal */
export function setPublishMethod(method: PublishMethod) {
    _publishMethod = method
}

function init() {
    if (_publishMethod !== undefined) {
        // _publishMethod was set externally.
        return
    }

    if (Core == undefined) {
        throw new Error("UPL is not initialized!")
    }

    let prCtx = Core.PluginRunnerContext;
    if (prCtx == undefined) {
        throw new Error("UPL: PluginRunnerContext is undefined! Called too soon?")
    }

    _publishMethod = prCtx.socket._dispatcher.publish
        .bind(prCtx.socket._dispatcher) as PublishMethod;
}

/**
 * Fires a websocket event.
 * This method is a wrapper around {@link publishMessage}
 * that publishes a websocket message with EVENT(8) type.
 * @param endpoint The endpoint to fire the event on.
 * @param payload The payload to send with the event.
 * @throws Will throw an error if UPL is not initialized,
 * or plugin runner context is not yet available.
 */
export function fireEvent(endpoint: string, payload: any) {
    publishMessage(
        endpoint,
        JSON.stringify(
            [
                8,
                "OnJsonApiEvent",
                { "data": payload }
            ]
        )
    )
}

/**
 * Publishes a websocket message.
 * Difference from {@link fireEvent} is that this method publishes a _RAW_ websocket message.
 * Meaning that you have to specify message type, and can publish a message that is not an event.
 * @param endpoint The endpoint to publish the message on.
 * @param payload The payload to send with the message.
 * @throws Will throw an error if UPL is not initialized,
 * or plugin runner context is not yet available.
 */
export function publishMessage(endpoint: string, payload: any) {
    _once.trigger()

    _publishMethod!(endpoint, payload)
}
