import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot {
  public id: string;
  public version: number = 0; 
  private uncommittedEvents: DomainEvent[] = [];

  constructor(id: string) {
    this.id = id;
  }

  public loadFromHistory(history: DomainEvent[]): void {
    for (const event of history) {
      this.apply(event);
      this.version++;
    }
  }

  protected applyChange(event: DomainEvent): void {
    this.apply(event);
    this.uncommittedEvents.push(event);
  }

  public getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  public markChangesAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  protected abstract apply(event: DomainEvent): void;
}