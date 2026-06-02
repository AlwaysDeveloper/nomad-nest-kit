import { Inject } from '@nestjs/common';

export const InjectHttpClient = (name: string) => Inject(`${name}_HTTP_CLIENT`);
