import { DomainEvent } from '../../core/DomainEvent';

export class MoneyWithdrawn implements DomainEvent {
  public readonly type = 'MoneyWithdrawn';
  public readonly timestamp = new Date();
  constructor(public data: { accountId: string; amount: number }) {}
}