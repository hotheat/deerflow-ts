import { Interface } from '@core/common/interface/Interface';

export interface TransactionalInterface<TInterfaceDto, TInterfaceResult> extends Interface<TInterfaceDto, TInterfaceResult> {
  onCommit?: (result: TInterfaceResult, port: TInterfaceDto) => Promise<void>;
  onRollback?: (error: Error, port: TInterfaceDto) => Promise<void>
}

