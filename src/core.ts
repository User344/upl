class UPLCore {
	Context: PenguContext

	constructor(context: PenguContext) {
		this.Context = context
	}
}
export let Core: UPLCore | undefined

export function initCore(context: PenguContext) {
	if (Core != undefined) {
		throw new Error("UPL is already initialized!")
	}

	Core = new UPLCore(context)
}
