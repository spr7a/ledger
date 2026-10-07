import { expect, test, describe } from 'vitest';
import { AccountAggregate } from './AccountAggregate';

describe('AccountAggregate', () => {
  test('should create a new account', () => {
    // 1. GIVEN an empty aggregate
    const account = new AccountAggregate('test-acc-1');
    
    // 2. WHEN we create it
    account.create('USD');
    
    // 3. THEN it should emit exactly one AccountCreated event
    const events = account.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('AccountCreated');
    expect(events[0].data).toMatchObject({ 
      accountId: 'test-acc-1', 
      currency: 'USD' 
    });
  });

  test('should deposit money into an existing account', () => {
    // 1. GIVEN an existing account (Rehydrated from historical events)
    const account = new AccountAggregate('test-acc-2');
    account.loadFromHistory([
      { 
        type: 'AccountCreated', 
        data: { accountId: 'test-acc-2', currency: 'USD' }, 
        timestamp: new Date() 
      }
    ]);

    // 2. WHEN we deposit $500
    account.deposit(500);

    // 3. THEN it should emit a MoneyDeposited event and update state
    const events = account.getUncommittedEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('MoneyDeposited');
    expect(events[0].data).toMatchObject({ 
      accountId: 'test-acc-2', 
      amount: 500 
    });
    expect(account.getBalance()).toBe(500);
  });

  test('should prevent withdrawal if balance is insufficient', () => {
    const account = new AccountAggregate('test-acc-3');
    account.loadFromHistory([
      { type: 'AccountCreated', data: { accountId: 'test-acc-3', currency: 'USD' }, timestamp: new Date() },
      { type: 'MoneyDeposited', data: { accountId: 'test-acc-3', amount: 100 }, timestamp: new Date() }
    ]);

    // Expect the domain logic to throw an error
    expect(() => account.withdraw(500)).toThrow('Insufficient funds');
    
    // Verify no illicit events were generated
    expect(account.getUncommittedEvents().length).toBe(0);
  });
});