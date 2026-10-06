import { DomainEvent } from '../../core/DomainEvent';

export class MoneyDeposited implements DomainEvent {
  public readonly type = 'MoneyDeposited';
  public readonly timestamp = new Date();
  constructor(public data: { accountId: string; amount: number }) {}
}