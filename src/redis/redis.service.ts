import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constant';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
  ) {}

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (ttl) {
      await this.client.set(key, JSON.stringify({ value }), 'EX', ttl);
    }
    await this.client.set(key, JSON.stringify({ value }));

    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    const objectJson = await this.client.get(key);
    if (!objectJson) {
      return null;
    }

    const object = JSON.parse(objectJson);

    return object.value;
  }

  async delete(key: string) {
    return await this.client.del(key);
  }

  async exists(key: string) {
    return this.client.exists(key);
  }

  getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
