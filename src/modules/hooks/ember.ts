import { Core } from 'src/core'
import { Once } from 'src/utils/once'

type MatcherCallback = (object: any) => boolean
type HookCallback = (ember: any, original: any, ...args: any[]) => any
type MixinCallback = (ember: any) => any

type HookEntry = {
    method: string,
    callback: HookCallback
}

type Entry = {
    hooks: HookEntry[],
    mixins: MixinCallback[]
}

type MatchingEntry = {
    matcher: MatcherCallback,
    entry: Entry
}

const _componentEntriesNames = new Map<string, Entry>()
const _componentEntriesMatching: MatchingEntry[] = []
const _serviceEntriesMatching: MatchingEntry[] = []
const _initOnce = new Once(init)

/**
 * Hooks ember component's method by name.
 * @param callback Fired when method named {@link methodName} in class named {@link className} is called.
 */
export function hookComponentMethodByName(className: string, methodName: string, callback: HookCallback) {
    _initOnce.trigger()

    var hookEntry: HookEntry = { method: methodName, callback: callback }

    var entry = _componentEntriesNames.get(className)
    if (entry === undefined) {
        _componentEntriesNames.set(className, { hooks: [hookEntry], mixins: [] })
    } else {
        entry.hooks.push(hookEntry)
    }
}

/**
 * Hooks ember component's method by matching object's properties.
 * @param callback Fired when method named {@link methodName} in class matching {@link matcher} is called.
 */
export function hookComponentMethodByMatching(matcher: MatcherCallback, methodName: string, callback: HookCallback) {
    _initOnce.trigger()

    var hookEntry: HookEntry = { method: methodName, callback: callback }
    _componentEntriesMatching.push({ matcher: matcher, entry: { hooks: [hookEntry], mixins: [] } })
}

/**
 * Extends and overrides properties of a class with name {@link className}.
 * @param callback Fired when class named {@link className} is created.
 */
export function extendClassByName(className: string, callback: MixinCallback) {
    _initOnce.trigger()

    var entry = _componentEntriesNames.get(className)
    if (entry === undefined) {
        _componentEntriesNames.set(className, { hooks: [], mixins: [callback] })
    } else {
        entry.mixins.push(callback)
    }
}

/**
 * Extends and overrides properties of a class matching {@link matcher}.
 * @param callback Fired when class matching {@link matcher} is created.
 */
export function extendClassByMatching(matcher: MatcherCallback, callback: MixinCallback) {
    _initOnce.trigger()

    _componentEntriesMatching.push({ matcher: matcher, entry: { hooks: [], mixins: [callback] } })
}

/**
 * Hooks ember service's method by matching object's properties.
 * @param callback Fired when method named {@link methodName} in service matching {@link matcher} is called.
 */
export function hookServiceMethodByMatching(matcher: MatcherCallback, methodName: string, callback: HookCallback) {
    _initOnce.trigger()

    var hookEntry: HookEntry = { method: methodName, callback: callback }
    _serviceEntriesMatching.push({ matcher: matcher, entry: { hooks: [hookEntry], mixins: [] } })
}

/**
 * Extends and overrides properties of a service matching {@link matcher}.
 * @param callback Fired when service matching {@link matcher} is created.
 */
export function extendServiceByMatching(matcher: MatcherCallback, callback: MixinCallback) {
    _initOnce.trigger()

    _serviceEntriesMatching.push({ matcher: matcher, entry: { hooks: [], mixins: [callback] } })
}

function init() {
    let context = Core?.Context

    if (context == null) {
        throw new Error("UPL is not initialized!")
    }

    context.rcp.postInit('rcp-fe-ember-libs', async (api: any) => {
        const originalGetEmber = api.getEmber as Function
        api.getEmber = function(...args: any[]) {
            const result = originalGetEmber.apply(this, args)

            result.then((Ember: any) => {
                const originalExtend = Ember.Component.extend as Function
                const originalServiceExtend = Ember.Service.extend as Function

                Ember.Component.extend = function(...args: any[]): any {
                    let result = originalExtend.apply(this, arguments)

                    const potentialObjects = args
                        .filter(x => typeof x === 'object')

                    for (const obj of potentialObjects) {
                        for (const entry of _componentEntriesMatching) {
                            if (entry.matcher(obj)) {
                                result = handleEntry(Ember, entry.entry, result)
                            }
                        }
                    }

                    const classNames = potentialObjects
                        .filter(x => x.classNames && Array.isArray(x.classNames))
                        .map(x => x.classNames.join(' '))

                    for (const className of classNames) {
                        const entry = _componentEntriesNames.get(className)
                        if (entry === undefined) {
                            continue;
                        }

                        result = handleEntry(Ember, entry, result)
                    }

                    return result
                }

                Ember.Service.extend = function(...args: any[]): any {
                    let result = originalServiceExtend.apply(this, arguments)

                    const potentialObjects = args
                        .filter(x => typeof x === 'object')

                    for (const obj of potentialObjects) {
                        for (const entry of _serviceEntriesMatching) {
                            if (entry.matcher(obj)) {
                                result = handleEntry(Ember, entry.entry, result)
                            }
                        }
                    }
                    return result
                }

                return Ember
            })

            return result
        }
    })
}

function handleEntry(Ember: any, entry: Entry, result: any): any {
    const proto = result.proto()

    if (proto.__UPL_IS_HOOKED) {
        return result
    }
    proto.__UPL_IS_HOOKED = true

    for (const mixin of entry.mixins) {
        result = result.extend(mixin(Ember))
    }

    for (const hook of entry.hooks) {
        const original = proto[hook.method] as Function

        proto[hook.method] = function(...args: any[]) {
            const proxyOriginal = (...args: any[]) => {
                if (original != undefined) {
                    return original.apply(this, args)
                }
            }

            return hook.callback.call(this, Ember, proxyOriginal, ...args)
        }
    }

    return result
}

