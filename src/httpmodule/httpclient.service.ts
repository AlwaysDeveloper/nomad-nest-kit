import { Injectable } from '@nestjs/common';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpclientService {
  constructor(private readonly client: AxiosInstance) {}

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
}
