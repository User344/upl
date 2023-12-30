interface PenguRCP {
  preInit(name: string, callback: (provider: any) => any)
  postInit(name: string, callback: (api: any) => any)
  whenReady(name: string): Promise<any>
  whenReady(names: string[]): Promise<any[]>
}

interface PenguContext {
  readonly rcp: PenguRCP
}
