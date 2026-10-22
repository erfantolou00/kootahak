import { REDIS_CLIENT } from "./redis.constants";
import { getRedisOptions } from "./redis-options";
import { Redis } from "ioredis";

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: () => new Redis(getRedisOptions()),
};
