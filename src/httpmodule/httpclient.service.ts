import { Injectable } from '@nestjs/common';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class HttpclientService {
  constructor(
    private readonly client: AxiosInstance,
    private readonly circuitBreakerService?: CircuitBreakerService,
  ) {}

  get<T>(
    url: string,

    config?: AxiosRequestConfig,
  ) {
    return this.client.get<T>(url, config);
  }

  post<T>(
    url: string,

    data?: unknown,

    config?: AxiosRequestConfig,
  ) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(
    url: string,

    data?: unknown,

    config?: AxiosRequestConfig,
  ) {
    return this.client.put<T>(url, data, config);
  }

  delete<T>(
    url: string,

    config?: AxiosRequestConfig,
  ) {
    return this.client.delete<T>(url, config);
  }

  getRawClient() {
    return this.client;
  }

  /**
   * Get circuit breaker status for monitoring
   * Returns undefined if circuit breaker is not configured
   */
  getCircuitBreakerStatus() {
    return this.circuitBreakerService?.getStatus();
  }

  /**
   * Reset circuit breaker(s) for this client
   * @param key Optional specific circuit breaker key to reset. If not provided, resets all.
   */
  resetCircuitBreaker(key?: string) {
    this.circuitBreakerService?.reset(key);
  }
}

