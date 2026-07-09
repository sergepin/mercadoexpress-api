import { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : parseFloat(value)),
};
