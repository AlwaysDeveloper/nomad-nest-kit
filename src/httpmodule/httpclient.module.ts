import { DynamicModule, Module, Provider } from '@nestjs/common';

import axios, { AxiosInstance } from 'axios';
import { HttpclientService } from './httpclient.service';
import { getHttpClientToken } from './http.contants';
import { HttpClientConfig } from './http.interface';

@Module({})
export class HttpClientModule {
  static register(configs: HttpClientConfig[]): DynamicModule {
    const providers: Provider[] = configs.map((config) => {
      const axiosClient: AxiosInstance = axios.create({
        timeout: config.timeout ?? 5000,
        ...config,
      });

      axiosClient.interceptors.response.use(
        (response) => response,

        async (error) => {
          const requestConfig: any = error.config;

          const retryAllowed = config.retryEnable;

          const retries = requestConfig?.retryCount ?? 0;

          if (
            retryAllowed &&
            requestConfig &&
            retries < (config.maxRetries ?? 3)
          ) {
            requestConfig.retryCount = retries + 1;

            await new Promise((resolve) =>
              setTimeout(
                resolve,

                config.retryDelayMs ?? 1000,
              ),
            );

            return axiosClient(requestConfig);
          }

          throw error;
        },
      );

      config.requestInterceptors?.forEach((interceptor) => {
        axiosClient.interceptors.request.use(
          interceptor.onFulfilled,

          interceptor.onRejected,
        );
      });

      config.responseInterceptors?.forEach((interceptor) => {
        axiosClient.interceptors.response.use(
          interceptor.onFulfilled,

          interceptor.onRejected,
        );
      });

      const service = new HttpclientService(axiosClient);

      return {
        provide: getHttpClientToken(config.name),

        useValue: service,
      };
    });

    return {
      module: HttpClientModule,
      providers,
      exports: providers,
    };
  }
}
