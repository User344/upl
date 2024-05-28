interface PenguRCP {
  preInit(name: string, callback: (provider: any) => any)
  postInit(name: string, callback: (api: any) => any)
}

interface PenguContext {
  readonly rcp: PenguRCP
}
