import { AccountAggregate } from './account/AccountAggregate';
import { AccountRepository } from './infrastructure/AccountRepository';
import { initializeDatabase } from './infrastructure/db';

async function run() {
  await initializeDatabase();
  const repository = new AccountRepository();
  const accountId = `acc-snap-${Math.floor(Math.random() * 1000)}`; 

  console.log('--- SCENARIO 1: GENERATING EVENTS ---');
  const account = new AccountAggregate(accountId);
  
  account.create('USD'); // Version 1
  account.deposit(100);  // Version 2
  account.deposit(100);  // Version 3
  account.deposit(100);  // Version 4
  account.deposit(100);  // Version 5 (Threshold crossed!)
  account.deposit(100);  // Version 6
   account.deposit(100); 
    account.deposit(100); 
     account.deposit(100); 
      account.deposit(100); 
  
  await repository.save(account);
  console.log(`Saved 6 events. Expected balance: $500. Actual: $${account.getBalance()}`);

  console.log('\n--- SCENARIO 2: LOADING FROM SNAPSHOT ---');
  // When we load it, it should hit the snapshot log and skip events 1-5
  const rehydratedAccount = await repository.load(accountId);
  
  console.log(`Rehydrated balance: $${rehydratedAccount.getBalance()}`);
  
  process.exit(0);
}

run();