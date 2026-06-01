import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constant';
import { RedisModuleAsyncOptions, RedisModuleOptions } from './redis.interface';

@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions): DynamicModule {
    const redisProvider = {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = new Redis({
          host: options.host,
          port: options.port,
          password: options.password,
          db: options.db,
        });

        client.on('connect', () => {
          console.log('Connected to Redis');
        });

        client.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        return client;
      },
    };

    return {
      module: RedisModule,
      providers: [redisProvider],
      exports: [redisProvider],
      global: true,
    };
  }

  static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const redisProvider: Provider = {
      provide: REDIS_CLIENT,
      useFactory: async (...args: any[]) => {
        const redisOptions = await options.useFactory(...args);
        const client = new Redis({
          host: redisOptions.host,
          port: redisOptions.port,
          password: redisOptions.password,
          db: redisOptions.db,
        });

        client.on('connect', () => {
          console.log('Connected to Redis');
        });

        client.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        return client;
      },
      inject: options.inject || [],
    };

    return {
      module: RedisModule,
      imports: options.imports || [],
      providers: [redisProvider],
      exports: [redisProvider],
      global: true,
    };
  }
}
