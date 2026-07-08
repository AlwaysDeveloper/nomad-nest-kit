import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';
import { HTTP_CLIENT_MODULE_OPTIONS } from './http-client.constants';
import type { HttpClientModuleOptions } from './http-client-options.interface';

@Injectable()
export class HttpClientService implements OnModuleInit {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly breakerRegistry: CircuitBreakerRegistry,
    @Inject(HTTP_CLIENT_MODULE_OPTIONS)
    private readonly options: HttpClientModuleOptions,
  ) {}

  onModuleInit() {
    this.registerInterceptors();
  }

  private registerInterceptors() {
    const axiosInstance = this.httpService.axiosRef;

    for (const interceptor of this.options.requestInterceptors ?? []) {
      // cast to any to satisfy axios internal request config typing differences
      axiosInstance.interceptors.request.use(interceptor as any);
    }

    for (const { onFulfilled, onRejected } of this.options
      .responseInterceptors ?? []) {
      axiosInstance.interceptors.response.use(onFulfilled, onRejected);
    }
  }

  get<T = any>(url: string, config?: AxiosRequestConfig, breakerKey?: string) {
    return this.request<T>({ ...config, method: 'GET', url }, breakerKey);
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    breakerKey?: string,
  ) {
    return this.request<T>({ ...config, method: 'POST', url, data }, breakerKey);
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    breakerKey?: string,
  ) {
    return this.request<T>({ ...config, method: 'PUT', url, data }, breakerKey);
  }

  patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    breakerKey?: string,
  ) {
    return this.request<T>({ ...config, method: 'PATCH', url, data }, breakerKey);
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig, breakerKey?: string) {
    return this.request<T>({ ...config, method: 'DELETE', url }, breakerKey);
  }

  /**
   * Low-level entry point. `breakerKey` groups requests under the same
   * circuit breaker instance — defaults to "default" (one breaker for the
   * whole client). Pass a per-route key (e.g. the route template) if you
   * want isolation between endpoints on the same base URL.
   */
  async request<T = any>(
    config: AxiosRequestConfig,
    breakerKey = 'default',
  ): Promise<AxiosResponse<T>> {
    const execute = () => firstValueFrom(this.httpService.request<T>(config));

    if (this.options.circuitBreaker === false) {
      return execute();
    }

    const breaker = this.breakerRegistry.getBreaker(
      breakerKey,
      execute,
      this.options.circuitBreaker ?? {},
    );

    try {
      return await breaker.fire();
    } catch (err: any) {
      this.logger.error(
        `${config.method?.toUpperCase()} ${config.url} failed [breaker="${breakerKey}"]: ${err.message}`,
      );
      throw err;
    }
  }

  getBreakerStatus(breakerKey = 'default') {
    return this.breakerRegistry.getStatus(breakerKey);
  }

  getAllBreakerStatuses() {
    return this.breakerRegistry.getAllStatuses();
  }

  /** Escape hatch for anything the wrapper doesn't expose. */
  get axiosInstance() {
    return this.httpService.axiosRef;
  }
}
