# http-client module — usage

## 1. Install the one extra dependency

```bash
npm i opossum
npm i -D @types/opossum   # only needed if your opossum version doesn't ship its own types
```

You already have `@nestjs/axios`, `@nestjs/common`, `axios`, `rxjs` — nothing else required.

## 2. Register with env-based config (registerAsync)

Using `ConfigService` (recommended over reading `process.env` directly, but both work):

```typescript
// downstream/downstream.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpClientModule } from '../http-client';
import { DownstreamService } from './downstream.service';

@Module({
  imports: [
    HttpClientModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('DOWNSTREAM_SERVICE_URL'),
        timeout: 5000,
        headers: {
          'x-api-key': config.get<string>('DOWNSTREAM_API_KEY') ?? '',
        },
        circuitBreaker: {
          timeout: 5000,
          errorThresholdPercentage: 50, // open after 50% of calls fail
          resetTimeout: 15000,          // stay open 15s before probing again
          volumeThreshold: 5,           // need at least 5 calls before evaluating
        },
        requestInterceptors: [
          (cfg) => {
            cfg.headers = { ...cfg.headers, 'x-request-id': crypto.randomUUID() };
            return cfg;
          },
        ],
        responseInterceptors: [
          {
            onFulfilled: (res) => res,
            onRejected: (err) => {
              // normalize downstream errors here before they bubble up
              return Promise.reject(err);
            },
          },
        ],
      }),
    }),
  ],
  providers: [DownstreamService],
  exports: [DownstreamService],
})
export class DownstreamModule {}
```

If you'd rather read straight off `process.env` without `@nestjs/config`:

```typescript
HttpClientModule.registerAsync({
  useFactory: () => ({
    baseURL: process.env.DOWNSTREAM_SERVICE_URL!,
    timeout: Number(process.env.DOWNSTREAM_TIMEOUT_MS ?? 5000),
  }),
})
```

## 3. Consume it

```typescript
// downstream/downstream.service.ts
import { Injectable } from '@nestjs/common';
import { HttpClientService } from '../http-client';

@Injectable()
export class DownstreamService {
  constructor(private readonly http: HttpClientService) {}

  async getOrder(orderId: string) {
    // 3rd arg is optional; use it to isolate this route's breaker from others
    const { data } = await this.http.get(`/orders/${orderId}`, undefined, 'get-order');
    return data;
  }

  async createOrder(payload: unknown) {
    const { data } = await this.http.post('/orders', payload, undefined, 'create-order');
    return data;
  }

  checkHealth() {
    return this.http.getBreakerStatus('get-order');
    // -> { key: 'get-order', state: 'closed' | 'open' | 'halfOpen', stats: {...} }
  }
}
```

## Notes on the breaker key

Every call takes an optional trailing `breakerKey` (defaults to `"default"`).
Calls sharing a key share one opossum breaker. If you don't pass a key,
every request through that client trips the same breaker — fine for a
client that only talks to one endpoint. For a client hitting several
routes on the same host, pass distinct keys per route so a flaky
`/reports` endpoint doesn't fail-fast your `/orders` calls too.

## Disabling the breaker for one client

```typescript
HttpClientModule.register({
  baseURL: 'https://internal-trusted-service',
  circuitBreaker: false,
})
```

## Multiple downstream clients

Register `HttpClientModule` once per downstream dependency, each in its
own feature module (as above), rather than one shared global instance —
that way each gets its own base URL, breaker config, and interceptors.
