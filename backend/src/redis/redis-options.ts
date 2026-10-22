import type { RedisOptions } from "ioredis";

function optionsFromUrl(url: string): RedisOptions {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: decodeURIComponent(parsed.username) || undefined,
    password: decodeURIComponent(parsed.password) || undefined,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export function getRedisOptions(): RedisOptions {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (url) {
    return optionsFromUrl(url);
  }

  return {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  };
}

export function getBullMqConnection() {
  const options = getRedisOptions();

  return {
    host: options.host,
    port: options.port,
    username: options.username,
    password: options.password,
    tls: options.tls,
    maxRetriesPerRequest: null,
  };
}
