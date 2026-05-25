export interface StoreContract<TState, TSaveInput = TState, TResetResult = TState> {
  load: () => TState
  save: (value: TSaveInput) => void
  reset: () => TResetResult
}
