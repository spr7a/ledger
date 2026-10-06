import { AccountAggregate } from './account/AccountAggregate';
import { AccountRepository } from './infrastructure/AccountRepository';
import { initializeDatabase } from './infrastructure/db';

async function run() {
  await initializeDatabase();
  const repository = new AccountRepository();
  const accountId = 'acc-980';

  console.log('--- SCENARIO 1: SAVING TO POSTGRES ---');
  const newAccount = new AccountAggregate(accountId);
  newAccount.create('USD');
  newAccount.deposit(10);
  newAccount.withdraw(2);
  newAccount.withdraw(2);
  newAccount.withdraw(2);

  // This actually writes to the database
  await repository.save(newAccount);
  console.log(`Saved events to database. Account balance: $${newAccount.getBalance()}`);

  console.log('\n--- SCENARIO 2: LOADING FROM POSTGRES ---');
  // We fetch a brand new aggregate purely from the database rows
  const rehydratedAccount = await repository.load(accountId);
  
  console.log(`Rehydrated balance: $${rehydratedAccount.getBalance()}`);

  // Test business rules on the rehydrated state
  try {
    rehydratedAccount.withdraw(50); // Attempt to overdraft 
  } catch (error: any) {
    console.log(`Withdrawal rejected correctly: ${error.message}`);
  }

  process.exit(0);
}

run();