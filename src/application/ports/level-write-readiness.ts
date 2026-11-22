export interface ILevelWriteReadiness {
  assertReady(): Promise<void>;
}
