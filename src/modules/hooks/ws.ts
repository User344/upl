import { Core } from 'src/core'
import { Once } from 'src/utils/once'

let _wsHookMap: { [id: string]: (content: any, original: (content: any) => void) => void } = {}
const _initOnce = new Once(init)

/**
 * Hook a websocket endpoint.
 */
export function hook(endpoint: string, callback: (content: any, original: (content: any) => void) => void) {
    _initOnce.trigger()
    _wsHookMap[endpoint] = callback
}

/**
 * Hook a websocket text endpoint.
 */
export function hookText(endpoint: string, callback: (content: string, original: (content: string) => void) => void) {
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

function init() {
    let context = Core?.Context

    if (context == null) {
        throw new Error("UPL is not initialized!")
    }

    context.rcp.postInit('rcp-fe-common-libs', async (api) => {
        let originalGetDataBinding = api.getDataBinding

        api.getDataBinding = async function(rcp_name: string) {
            let originalDataBinding = await originalGetDataBinding.apply(this, arguments)

            let hookedDataBinding = function(this: any, basePath: string, socket: any) {
                let dataBinding = originalDataBinding.apply(this, arguments)
                let cache = dataBinding.cache

                // FIXME: Hooking _triggerResourceObservers only changes data on update,
                // and doesn't change it on initial databinding call if data is cached (iirc)

                let originalTriggerObservers = cache._triggerResourceObservers
                cache._triggerResourceObservers = function(this: any, endpoint: string, content: any, error: any) {
                    const callback = _wsHookMap[endpoint]
                    if (callback == undefined) {
                        return originalTriggerObservers.apply(this, [endpoint, content, error])
                    }

                    let original = (content: any) => {
                        originalTriggerObservers.apply(this, [endpoint, content, error])
                    }

                    return callback(content, original)
                }

                return dataBinding
            }

            // @ts-ignore
            hookedDataBinding.bindTo = function(socket: any) {
                let result = originalDataBinding.bindTo.apply(this, arguments)
                result.dataBinding = hookedDataBinding
                return result
            }

            return Promise.resolve(hookedDataBinding)
        }
    })
}
