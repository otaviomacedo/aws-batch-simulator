export interface Job {
  readonly runningTime: number;
  readonly insertTime: number;
  readonly vCpus: number;
  readonly shareIdentifier: string;
  readonly definitionId: string;
}
