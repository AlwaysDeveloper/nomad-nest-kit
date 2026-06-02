# HTTP Client Module with Circuit Breaker Support

This module provides both simple HTTP functionality and optional circuit-breaker resilience patterns for NestJS applications.

## Basic Usage (Without Circuit Breaker)

```typescript
import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nomad-nest-kit/httpmodule';

@Module({
  imports: [
    HttpClientModule.register([
      {
        name: 'external-api',
        baseURL: 'https://api.example.com',
        timeout: 5000,
        retryEnable: true,
        maxRetries: 3,
      },
    ]),
  ],
})
export class AppModule {}
```

Usage in a service:

```typescript
import { Injectable } from '@nestjs/common';
import { HttpclientService, getHttpClientToken } from '@nomad-nest-kit/httpmodule';

@Injectable()
export class MyService {
  constructor(
    @Inject(getHttpClientToken('external-api'))
    private httpClient: HttpclientService,
  ) {}

  async fetchData() {
    const response = await this.httpClient.get('/data');
    return response.data;
  }
}
```

## Usage with Circuit Breaker

Enable circuit breaker for resilience:

```typescript
import { Module } from '@nestjs/common';
import { HttpClientModule } from '@nomad-nest-kit/httpmodule';

@Module({
  imports: [
    HttpClientModule.register([
      {
        name: 'critical-api',
        baseURL: 'https://critical-api.example.com',
        timeout: 5000,
        retryEnable: true,
        maxRetries: 3,
        circuitBreaker: {
          failureThreshold: 5,      // Open after 5 failures
          successThreshold: 2,      // Close after 2 successes
          timeout: 30000,           // Retry after 30 seconds
        },
      },
    ]),
  ],
})
export class AppModule {}
```

## Circuit Breaker Configuration Options

- **failureThreshold** (default: 5): Number of failures before opening the circuit breaker
- **successThreshold** (default: 2): Number of successful requests to close an open circuit
- **timeout** (default: 30000ms): Time before attempting to close the circuit (move to HALF_OPEN state)

## Monitoring Circuit Breaker Status

```typescript
@Injectable()
export class MonitoringService {
  constructor(
    @Inject(getHttpClientToken('critical-api'))
    private httpClient: HttpclientService,
  ) {}

  getHealthStatus() {
    const status = this.httpClient.getCircuitBreakerStatus();
    console.log('Circuit Breaker Status:', status);
    // Returns: { 'critical-api:GET:/endpoint': { state: 'CLOSED', successCount: 10, failureCount: 0 } }
  }

  resetCircuitBreaker() {
    this.httpClient.resetCircuitBreaker();
  }
}
```

## Circuit Breaker States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, requests are rejected with error
- **HALF_OPEN**: Testing if service recovered, limited requests allowed

## Backward Compatibility

The circuit breaker is completely optional. Existing code without `circuitBreaker` configuration will continue to work exactly as before with only retry functionality.

## Combined Example

```typescript
// Without circuit breaker (simple HTTP)
{
  name: 'simple-api',
  baseURL: 'https://simple-api.example.com',
  retryEnable: true,
  maxRetries: 2,
},

// With circuit breaker (resilient HTTP)
{
  name: 'critical-api',
  baseURL: 'https://critical-api.example.com',
  retryEnable: true,
  maxRetries: 2,
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
  },
},
```

Both can be used in the same application - choose circuit breaker only for critical endpoints.
