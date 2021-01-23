import { PubSubNew } from '../PubSub'

/**
 *  ZeroMQ used to manage communication between multiple API instances
 */
const zmq = require("zeromq");
const socket = zmq.socket("req");

/**
 * The communication object used by every instance of the server launched on AWS to communicate with one another.
 * Each API instance containes an active publisher. Mutations use this object to send a signal to a message queue launched on EC2.
 * The EC2 instance reverts the message back to all published instances (including the one that sent the message).
 * There is a listener waiting to hear those messages and that message is then moved to the WS resolvers.
 */
export class Publisher {

    /**
	 * Constructor used fot the actual connection and to specify a listener.
	 */
    constructor(pubsub: PubSubNew) {
        socket.connect('tcp://54.174.122.131:9998');
        socket.on("message", (message: string) => {
            const parsedMessage: any = JSON.parse(message);
            if (message !== undefined) {
                // On retrieving a signal from the message queue, send it to the WS client listeners
                pubsub.publish(parsedMessage.event, parsedMessage.payload);
            }
        });
    }

    /**
	 * Create GraphQL Schema from types & resolvers
	 */
    public publish(event: string, payload: any) {
        // Sends a signal to the message queue (instead of the local WS client listeners)
        socket.send(JSON.stringify({ event, payload }));
    }
    
}