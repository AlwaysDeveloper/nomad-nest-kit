import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit breaker
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Number of successful requests to close the circuit breaker
   * @default 2
   */
  successThreshold?: number;

  /**
   * Time in milliseconds before attempting to close the circuit
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Function to determine if an error should count as a failure
   * By default, only 5xx errors count as failures
   */
  shouldFail?: (error: unknown) => boolean;

  /**
   * Function to determine which responses should reset the failure count
   */
  shouldTrip?: (error: unknown) => boolean;
}

export interface HttpClientConfig extends AxiosRequestConfig {

  name: string;

  retryEnable?: boolean;

  maxRetries?: number;

  retryDelayMs?: number;

  /**
   * Circuit breaker configuration for resilience
   * Leave undefined to disable circuit breaker
   */
  circuitBreaker?: CircuitBreakerConfig;

  requestInterceptors?: Array<{
    onFulfilled?: (
      config: InternalAxiosRequestConfig,
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

    onRejected?: (error: unknown) => unknown;
  }>;

  responseInterceptors?: Array<{
    onFulfilled?: (
      response: AxiosResponse,
    ) => AxiosResponse | Promise<AxiosResponse>;

    onRejected?: (error: unknown) => unknown;
  }>;
}
