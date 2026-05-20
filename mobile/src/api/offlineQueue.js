import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBehavior } from "./client";

const QUEUE_KEY = "mindflow_behavior_queue";

async function readQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueBehavior(userId, payload) {
  const queue = await readQueue();
  queue.push({ userId, payload, queuedAt: new Date().toISOString() });
  await writeQueue(queue);
  return queue.length;
}

export async function flushBehaviorQueue() {
  const queue = await readQueue();
  if (!queue.length) return { sent: 0, remaining: 0 };

  const remain = [];
  let sent = 0;

  for (const item of queue) {
    try {
      await createBehavior(item.userId, item.payload);
      sent += 1;
    } catch {
      remain.push(item);
    }
  }

  await writeQueue(remain);
  return { sent, remaining: remain.length };
}
