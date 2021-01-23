import { Emitter } from '@service/EventQueue/Emitter';
import { Listener } from '@service/EventQueue/Listener';

export class GlobalEventQueue {
  private emitter: Emitter;
  private listener: Listener;

  constructor() {
    this.emitter = new Emitter();
    this.listener = new Listener(this.emitter);
  }
  public emit(event: string, payload: any) {
    this.emitter.emit(event, payload);
  }

  public on(event: string, callback: (data: any) => void) {
    this.listener.on(event, callback);
  }
}
