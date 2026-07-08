import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CircuitBreakerRegistry } from './circuit-breaker.registry';
import { HTTP_CLIENT_MODULE_OPTIONS } from './http-client.constants';
import { HttpClientService } from './http-client.service';
import { HttpClientModuleAsyncOptions, HttpClientModuleOptions, HttpClientOptionsFactory } from './http-client-options.interface';


/**
 * Internal module whose only job is to resolve + export
 * HTTP_CLIENT_MODULE_OPTIONS asynchronously, so it can be imported both by
 * HttpClientModule itself and by HttpModule.registerAsync (which needs the
 * baseURL/timeout before it can build its axios instance).
 */
@Module({})
class HttpClientOptionsHolderModule {
  static forRoot(options: HttpClientModuleAsyncOptions): DynamicModule {
    return {
      module: HttpClientOptionsHolderModule,
      imports: options.imports ?? [],
      providers: createAsyncOptionsProviders(options),
      exports: [HTTP_CLIENT_MODULE_OPTIONS],
    };
  }
}

function createAsyncOptionsProviders(
  options: HttpClientModuleAsyncOptions,
): Provider[] {
  if (options.useFactory) {
    return [
      {
        provide: HTTP_CLIENT_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
    ];
  }

  const inject = options.useExisting ?? options.useClass;
  const providers: Provider[] = [
    {
      provide: HTTP_CLIENT_MODULE_OPTIONS,
      useFactory: async (factory: HttpClientOptionsFactory) =>
        factory.createHttpClientOptions(),
      inject: inject ? [inject] : [],
    },
  ];

  if (options.useClass) {
    providers.push({ provide: options.useClass, useClass: options.useClass });
  }

  return providers;
}

@Module({})
export class HttpClientModule {
  /** Synchronous registration — use when the baseURL is a static value. */
  static register(options: HttpClientModuleOptions): DynamicModule {
    return {
      module: HttpClientModule,
      imports: [
        HttpModule.register({
          baseURL: options.baseURL,
          timeout: options.timeout ?? 10000,
          headers: options.headers,
          ...options.axiosConfig,
        }),
      ],
      providers: [
        { provide: HTTP_CLIENT_MODULE_OPTIONS, useValue: options },
        CircuitBreakerRegistry,
        HttpClientService,
      ],
      exports: [HttpClientService],
    };
  }

  /**
   * Async registration — use when the baseURL/config comes from
   * ConfigService, process.env, or any other async source.
   *
   * @example
   * HttpClientModule.registerAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     baseURL: config.getOrThrow('DOWNSTREAM_SERVICE_URL'),
   *     timeout: 5000,
   *     circuitBreaker: { errorThresholdPercentage: 50, resetTimeout: 15000 },
   *   }),
   * })
   */
  static registerAsync(options: HttpClientModuleAsyncOptions): DynamicModule {
    const optionsHolder = HttpClientOptionsHolderModule.forRoot(options);

    return {
      module: HttpClientModule,
      global: options.isGlobal,
      imports: [
        optionsHolder,
        HttpModule.registerAsync({
          imports: [optionsHolder],
          inject: [HTTP_CLIENT_MODULE_OPTIONS],
          useFactory: (httpOptions: HttpClientModuleOptions) => ({
            baseURL: httpOptions.baseURL,
            timeout: httpOptions.timeout ?? 10000,
            headers: httpOptions.headers,
            ...httpOptions.axiosConfig,
          }),
        }),
      ],
      providers: [CircuitBreakerRegistry, HttpClientService],
      exports: [HttpClientService],
    };
  }
}
