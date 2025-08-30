export interface Interface<TInterfaceDto, TInterfaceResult> {
  execute(port?: TInterfaceDto): Promise<TInterfaceResult>;
}
