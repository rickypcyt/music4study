import { describe, expect, it } from 'vitest';
import { idListSchema } from '@/lib/schemas';

const A = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const B = '00000000-0000-0000-0000-000000000001';

describe('idListSchema', () => {
  it('separa los ids e ignora las comas sobrantes', () => {
    expect(idListSchema.parse(`${A},,${B},`)).toEqual([A, B]);
  });

  it.each(['abc', `${A},abc`, `${A}'; drop table links`])('rechaza "%s"', (value) => {
    expect(idListSchema.safeParse(value).success).toBe(false);
  });
});
