class UPLCore {
    Context: PenguContext
    PluginRunnerContext: any | null

    constructor(context: PenguContext) {
        this.Context = context
        this.PluginRunnerContext = null
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
        }
    })
}
