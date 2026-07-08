declare module '@jspawn/ghostscript-wasm' {
  const factory: (options: Record<string, unknown>) => Promise<any>;
  export = factory;
}
