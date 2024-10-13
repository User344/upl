import { initCore } from './core'

import * as ws from './modules/ws'
import * as observer from './modules/observer'
import * as hooks from './modules/hooks'
// import * as settings from './modules/settings'
export { ws, observer, hooks, /*settings*/ }

/**
 * Init UPL.
 * Must be called once at startup before calling any other functions.
 * @throws Will throw an error if UPL is already initialized or {@see penguContext} is not a valid Pengu Context.
 */
export function init(penguContext: any) {
    if (penguContext.rcp === undefined ||
        typeof penguContext.rcp.preInit != 'function' ||
        typeof penguContext.rcp.postInit != 'function') {
        throw new Error('context is not a valid Pengu Context!')
    }

    initCore(penguContext as PenguContext)
}
