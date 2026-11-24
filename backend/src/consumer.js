import 'dotenv/config';
import { kafka, topic } from './config/kafka.js';
import { withTenantTransaction } from './config/db.js';

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'orders-inventory-worker' });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  console.log(`Consumer subscribed to ${topic}`);
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic: topicName, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      if (event.eventType !== 'OrderCreated') return;
      await withTenantTransaction(event.tenantId, async (db) => {
        const seen = await db.query('SELECT event_id FROM processed_events WHERE event_id = $1', [event.eventId]);
        if (seen.rowCount) return;
        for (const item of event.items) {
          const updated = await db.query(
            `UPDATE products SET inventory_quantity = inventory_quantity - $1
             WHERE tenant_id = $2 AND id = $3 AND inventory_quantity >= $1`,
            [item.quantity, event.tenantId, item.productId]
          );
          if (!updated.rowCount) throw new Error(`Inventory update failed for product ${item.productId}`);
        }
        await db.query(
          'INSERT INTO processed_events (event_id, tenant_id) VALUES ($1, $2)',
          [event.eventId, event.tenantId]
        );
      });
      await consumer.commitOffsets([{
        topic: topicName,
        partition,
        offset: (BigInt(message.offset) + 1n).toString()
      }]);
      console.log(`Processed tenant=${event.tenantId} order=${event.orderId} partition=${partition} offset=${message.offset}`);
    }
  });
}
main().catch((err) => { console.error('Consumer failed', err); process.exit(1); });
process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
