export interface DomainEvent {
  readonly type: string;
  readonly data: any;
  readonly timestamp: Date;
}