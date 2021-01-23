import { EventEmitter } from 'events'

export class Emitter {
  private emitter: EventEmitter
  constructor() {
    this.emitter = new EventEmitter()
  }

  public emit(event: string, payload: any) {
    this.emitter.emit(event, payload)
  }

  public get() {
    return this.emitter
  }
}
