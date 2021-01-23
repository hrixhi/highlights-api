import { Emitter } from "@service/EventQueue/Emitter";

export class Listener {
  private emitter: Emitter;
  constructor(emmiter: Emitter) {
    this.emitter = emmiter;
  }
  public on(event: string, callback: (payload?:any) => void) {
    this.emitter.get().on(event, callback);
  }
}
