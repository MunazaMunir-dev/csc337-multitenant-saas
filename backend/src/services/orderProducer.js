import { kafka, topic } from '../config/kafka.js';

let producer;
export async function publishOrderCreated(event) {
  if (!producer) {
    producer = kafka.producer({ allowAutoTopicCreation: true });
    await producer.connect();
  }
  await producer.send({
    topic,
    messages: [{
      key: event.tenantId, // all events for a tenant are routed to the same partition
      value: JSON.stringify(event),
      headers: { event_type: 'OrderCreated' }
    }]
  });
}
