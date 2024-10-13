import { Core } from 'src/core'

type PublishMethod = (endpoint: string, payload: string) => void

/**
 * Fires a websocket event.
 * This method is a wrapper around {@link publishMessage}
 * that publishes a websocket message with EVENT(8) type.
 * @param endpoint The endpoint to fire the event on.
 * @param payload The payload to send with the event.
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
 */
export function publishMessage(endpoint: string, payload: any) {
    if (Core == undefined) {
        throw new Error("UPL is not initialized!")
    }

    let prCtx = Core.PluginRunnerContext;
    if (prCtx == undefined) {
        throw new Error("UPL: PluginRunnerContext is undefined! Called too soon?")
    }

    let publishMethod = prCtx.socket._dispatcher.publish
        .bind(prCtx.socket._dispatcher) as PublishMethod;

    publishMethod(endpoint, payload)
}
