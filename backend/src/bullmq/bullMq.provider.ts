import { getBullMqConnection } from "../redis/redis-options";
import { VISIT_QUEUE } from "./bullMq.constant";
import { Queue } from "bullmq";

export const bullMQProvider = {
  provide: VISIT_QUEUE,
  useFactory: () =>
    new Queue("visit", {
      connection: getBullMqConnection(),
    }),
};
