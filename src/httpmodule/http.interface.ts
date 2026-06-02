import {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface HttpClientConfig extends AxiosRequestConfig {

  name: string;

  retryEnable?: boolean;

  maxRetries?: number;

  retryDelayMs?: number;

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
