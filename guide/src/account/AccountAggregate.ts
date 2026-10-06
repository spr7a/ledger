import { AggregateRoot } from '../core/AggregateRoot';
import { DomainEvent } from '../core/DomainEvent';

import { AccountCreated } from './events/AccountCreated';
import { MoneyDeposited } from './events/MoneyDeposited';
import { MoneyWithdrawn } from './events/MoneyWithdrawn';

export class AccountAggregate extends AggregateRoot {
  private balance: number = 0;
  private currency: string = '';
  private isOpen: boolean = false;

  constructor(id: string) {
    super(id);
  }

  public create(currency: string): void {
    if (this.isOpen) throw new Error('Account is already open');
    this.applyChange(new AccountCreated({ accountId: this.id, currency }));
  }

  public deposit(amount: number): void {
    if (!this.isOpen) throw new Error('Account is not open');
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    this.applyChange(new MoneyDeposited({ accountId: this.id, amount }));
  }

  public withdraw(amount: number): void {
    if (!this.isOpen) throw new Error('Account is not open');
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    if (this.balance - amount < 0) {
      throw new Error('Insufficient funds');
    }
    this.applyChange(new MoneyWithdrawn({ accountId: this.id, amount }));
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case 'AccountCreated':
        this.isOpen = true;
        this.currency = event.data.currency;
        this.balance = 0;
        break;
      case 'MoneyDeposited':
        this.balance += event.data.amount;
        break;
      case 'MoneyWithdrawn':
        this.balance -= event.data.amount;
        break;
    }
  }

  public getBalance(): number {
    return this.balance;
  }
  public getSnapshotData(): any {
    return {
      balance: this.balance,
      currency: this.currency,
      isOpen: this.isOpen
    };
  }

  // Imports a past snapshot so we don't start from 0
  public restoreFromSnapshot(version: number, data: any): void {
    this.version = version;
    this.balance = data.balance;
    this.currency = data.currency;
    this.isOpen = data.isOpen;
  }
}