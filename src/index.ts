import { initCore } from './core'

import * as observer from './modules/observer'
import * as hooks from './modules/hooks'
import * as uikit from './modules/uikit'
export { observer, hooks, uikit }

/**
 * Init UPL.
 * Must be called once at startup before calling any other functions.
 * @throws Will throw an error if UPL is already initialized.
 */
export function initUPL(context: PenguContext) {
	initCore(context)
}
