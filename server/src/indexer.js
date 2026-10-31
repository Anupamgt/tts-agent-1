import { publishLive } from './redisbus.js';
import { insertDecisionTrace } from './trace.js';

export async function runIndexer(db, redis, config) {
  if (!config.kafkaBrokers) {
    console.error('clinic-trace-indexer needs KAFKA_BOOTSTRAP_SERVERS');
    process.exit(1);
  }
  const { Kafka } = await import('kafkajs');
  const brokers = config.kafkaBrokers.split(',').map((s) => s.trim()).filter(Boolean);
  const kafka = new Kafka({ clientId: 'clinic-trace-indexer', brokers, connectionTimeout: 3000 });
  const consumer = kafka.consumer({ groupId: 'clinic-trace-indexer' });
  const producer = kafka.producer();
  for (;;) {
    try {
      await consumer.connect();
      await producer.connect();
      await consumer.subscribe({ topic: 'clinic.trace.events', fromBeginning: false });
      break;
    } catch (err) {
      console.error('indexer waiting for kafka', err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  const fails = new Map();
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const key = `${partition}:${message.offset}`;
      try {
        const parsed = JSON.parse(message.value.toString());
        const event = parsed.body || parsed;
        await insertDecisionTrace(db, event);
        if (event.call_id) await publishLive(redis, `live:call:${event.call_id}`, 'trace.appended', event);
        await consumer.commitOffsets([{ topic, partition, offset: String(Number(message.offset) + 1) }]);
        fails.delete(key);
      } catch (err) {
        const n = (fails.get(key) || 0) + 1;
        fails.set(key, n);
        console.error('indexer', err.message);
        if (n >= 3) {
          await producer.send({
            topic: 'clinic.dlq',
            messages: [{
              value: JSON.stringify({
                topic,
                partition,
                offset: message.offset,
                error: err.message,
              }),
            }],
          });
          await consumer.commitOffsets([{ topic, partition, offset: String(Number(message.offset) + 1) }]);
          fails.delete(key);
          return;
        }
        throw err;
      }
    },
  });
}
