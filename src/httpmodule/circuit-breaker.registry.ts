import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';
import { CircuitBreakerOptions } from './http-client-options.interface';

export interface BreakerStatus {
  key: string;
  state: 'open' | 'halfOpen' | 'closed';
  stats: CircuitBreaker.Stats;
}

/**
 * Holds one opossum breaker per "key" (e.g. per downstream route/method),
 * so a failing endpoint doesn't trip the breaker for every other call
 * made through the same HttpClientService instance.
 */
@Injectable()
export class CircuitBreakerRegistry {
  private readonly logger = new Logger(CircuitBreakerRegistry.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  getBreaker<TArgs extends unknown[], TResult>(
    key: string,
    action: (...args: TArgs) => Promise<TResult>,
    options: CircuitBreakerOptions = {},
  ): CircuitBreaker<TArgs, TResult> {
    const existing = this.breakers.get(key);
    if (existing) {
      return existing as CircuitBreaker<TArgs, TResult>;
    }

    const breaker = new CircuitBreaker(action, {
      timeout: options.timeout ?? 10000,
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
      resetTimeout: options.resetTimeout ?? 30000,
      rollingCountTimeout: options.rollingCountTimeout ?? 10000,
      rollingCountBuckets: options.rollingCountBuckets ?? 10,
      volumeThreshold: options.volumeThreshold ?? 5,
      name: key,
    });

    breaker.on('open', () =>
      this.logger.warn(`Circuit OPEN for "${key}" — failing fast`),
    );
    breaker.on('halfOpen', () =>
      this.logger.log(`Circuit HALF_OPEN for "${key}" — probing`),
    );
    breaker.on('close', () =>
      this.logger.log(`Circuit CLOSED for "${key}" — back to normal`),
    );
    breaker.on('reject', () =>
      this.logger.warn(`Call rejected for "${key}" — breaker is open`),
    );
    breaker.on('timeout', () =>
      this.logger.warn(`Call timed out for "${key}"`),
    );

    this.breakers.set(key, breaker);
    return breaker as CircuitBreaker<TArgs, TResult>;
  }

  getStatus(key: string): BreakerStatus | undefined {
    const breaker = this.breakers.get(key);
    if (!breaker) return undefined;

    const state = breaker.opened ? 'open' : breaker.halfOpen ? 'halfOpen' : 'closed';
    return { key, state, stats: breaker.stats };
  }

  getAllStatuses(): BreakerStatus[] {
    return Array.from(this.breakers.keys())
      .map((key) => this.getStatus(key))
      .filter((s): s is BreakerStatus => !!s);
  }
}
