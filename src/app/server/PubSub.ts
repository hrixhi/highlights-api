import { PubSub } from 'graphql-subscriptions';

/**
 * A child class was created to avoid WS connections from being disconnected 
 */
export class PubSubNew extends PubSub {
    public changeMax() {
        this.ee.setMaxListeners(Infinity);
    }
}
