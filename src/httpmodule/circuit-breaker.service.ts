import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Opossum from 'opossum';
import type { CircuitBreakerConfig } from './http.interface';

interface CircuitBreakerState {
  breaker: any;
  successCount: number;
  failureCount: number;
}

export class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  /**
   * Creates or gets a circuit breaker for the given key
   */
  private getCircuitBreaker<T>(
    key: string,
    action: () => Promise<T>,
    config: CircuitBreakerConfig,
  ): any {
    if (this.circuitBreakers.has(key)) {
      return this.circuitBreakers.get(key)!.breaker;
    }

    const options = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 30000,
    };

    const breaker = new Opossum(action, options);

    this.circuitBreakers.set(key, {
      breaker,
      successCount: 0,
      failureCount: 0,
    });

    return breaker;
  }

  /**
   * Wraps an HTTP request with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    config: CircuitBreakerConfig,
  ): Promise<AxiosResponse<T>> {
    const breaker = this.getCircuitBreaker(
      key,
      requestFn,
      config,
    );

    try {
      const result = await breaker.fire();
      // Track success
      const state = this.circuitBreakers.get(key);
      if (state) {
        state.successCount++;
        state.failureCount = 0;
      }
      return result;
    } catch (error: any) {
      // Track failure
      const state = this.circuitBreakers.get(key);
      if (state) {
        state.failureCount++;
      }

      // If circuit is open, throw a meaningful error
      if (breaker.opened) {
        throw new Error(
          `Circuit breaker is OPEN. Service temporarily unavailable. Key: ${key}`,
        );
      }
      throw error;
    }
  }

  /**
   * Wraps axios instance methods with circuit breaker
   */
  wrapAxiosInstance(
    client: AxiosInstance,
    config: CircuitBreakerConfig,
    clientName: string,
  ): AxiosInstance {
    const cbService = this;

    // Wrap each method
    const originalGet = client.get.bind(client);
    const originalPost = client.post.bind(client);
    const originalPut = client.put.bind(client);
    const originalDelete = client.delete.bind(client);

    (client.get as any) = function <T = any>(
      url: string,
      configArg?: AxiosRequestConfig,
    ) {
      const key = `${clientName}:GET:${url}`;
      return cbService.executeWithCircuitBreaker(
        key,
        () => originalGet(url, configArg),
        config,
      );
    };

    (client.post as any) = function <T = any>(
      url: string,
      data?: any,
      configArg?: AxiosRequestConfig,
    ) {
      const key = `${clientName}:POST:${url}`;
      return cbService.executeWithCircuitBreaker(
        key,
        () => originalPost(url, data, configArg),
        config,
      );
    };

    (client.put as any) = function <T = any>(
      url: string,
      data?: any,
      configArg?: AxiosRequestConfig,
    ) {
      const key = `${clientName}:PUT:${url}`;
      return cbService.executeWithCircuitBreaker(
        key,
        () => originalPut(url, data, configArg),
        config,
      );
    };

    (client.delete as any) = function <T = any>(
      url: string,
      configArg?: AxiosRequestConfig,
    ) {
      const key = `${clientName}:DELETE:${url}`;
      return cbService.executeWithCircuitBreaker(
        key,
        () => originalDelete(url, configArg),
        config,
      );
    };

    return client;
  }

  /**
   * Gets the status of all circuit breakers
   */
  getStatus(): Record<
    string,
    {
      state: string;
      successCount: number;
      failureCount: number;
    }
  > {
    const status: Record<
      string,
      {
        state: string;
        successCount: number;
        failureCount: number;
      }
    > = {};

    this.circuitBreakers.forEach((state, key) => {
      const breaker = state.breaker;
      status[key] = {
        state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
        successCount: state.successCount,
        failureCount: state.failureCount,
      };
    });

    return status;
  }

  /**
   * Resets a specific circuit breaker or all if no key provided
   */
  reset(key?: string): void {
    if (key) {
      const state = this.circuitBreakers.get(key);
      if (state) {
        state.breaker.close();
        state.successCount = 0;
        state.failureCount = 0;
      }
    } else {
      this.circuitBreakers.forEach((state) => {
        state.breaker.close();
        state.successCount = 0;
        state.failureCount = 0;
      });
    }
  }
}
