import { DomainEvent } from '../../core/DomainEvent';

export class AccountCreated implements DomainEvent {
  public readonly type = 'AccountCreated';
  public readonly timestamp = new Date();
  constructor(public data: { accountId: string; currency: string }) {}
}