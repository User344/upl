class UPLCore {
    Context: PenguContext
    PluginRunnerContext: any | undefined
    PluginRunnerContextAwaiters: ((ctx: any) => void)[]

    constructor(context: PenguContext) {
        this.Context = context
        this.PluginRunnerContext = undefined
        this.PluginRunnerContextAwaiters = []
    }
}
export let Core: UPLCore | undefined

export function initCore(context: PenguContext) {
    if (Core != undefined) {
        throw new Error("UPL is already initialized!")
    }

    Core = new UPLCore(context)

    context.rcp.preInit('rcp-fe-common-libs', async (api) => {
        if (Core !== undefined) {
            Core.PluginRunnerContext = api.context

            for (const awaiter of Core.PluginRunnerContextAwaiters) {
                awaiter(Core.PluginRunnerContext)
            }
        }
    })
}
