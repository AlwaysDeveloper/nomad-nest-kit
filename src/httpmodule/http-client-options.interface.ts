import { ModuleMetadata, Type } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';

export interface CircuitBreakerOptions {
  /** Time in ms before a request is considered timed out. Default 10000. */
  timeout?: number;
  /** % of failures within rolling window before breaker opens. Default 50. */
  errorThresholdPercentage?: number;
  /** Time in ms breaker stays OPEN before moving to HALF_OPEN. Default 30000. */
  resetTimeout?: number;
  /** Rolling window size in ms used to calculate stats. Default 10000. */
  rollingCountTimeout?: number;
  /** Number of buckets the rolling window is divided into. Default 10. */
  rollingCountBuckets?: number;
  /** Minimum number of requests in the window before breaker evaluates health. Default 5. */
  volumeThreshold?: number;
}

export type RequestInterceptor = (
  config: AxiosRequestConfig,
) => AxiosRequestConfig | Promise<AxiosRequestConfig>;

export interface ResponseInterceptor {
  onFulfilled?: (response: any) => any;
  onRejected?: (error: any) => any;
}

export interface HttpClientModuleOptions {
  /** Base URL for every request made through this client instance. */
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  /** Any extra axios config merged into the underlying HttpModule config. */
  axiosConfig?: AxiosRequestConfig;
  /** Pass `false` to disable the circuit breaker entirely for this client. */
  circuitBreaker?: CircuitBreakerOptions | false;
  /** Request interceptors registered on the underlying axios instance, in order. */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors registered on the underlying axios instance, in order. */
  responseInterceptors?: ResponseInterceptor[];
}

export interface HttpClientOptionsFactory {
  createHttpClientOptions():
    | Promise<HttpClientModuleOptions>
    | HttpClientModuleOptions;
}

export interface HttpClientModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /** Registers the module as global (available without re-importing). */
  isGlobal?: boolean;
  useExisting?: Type<HttpClientOptionsFactory>;
  useClass?: Type<HttpClientOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<HttpClientModuleOptions> | HttpClientModuleOptions;
  inject?: any[];
}
