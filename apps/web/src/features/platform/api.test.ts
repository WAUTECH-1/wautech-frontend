import { expect, test, vi } from 'vitest';
import { createPlatformApi } from './api';
const org = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
test('rejects foreign organization, member and profile payloads', async () => {
  const api = createPlatformApi(
    '',
    async () =>
      response({
        id: user,
        organizationId: user,
        role: 'VIEWER',
        status: 'ACTIVE',
      }),
    org,
    org,
  );
  await expect(api.organization()).rejects.toMatchObject({ kind: 'contract' });
  await expect(api.profile()).rejects.toMatchObject({ kind: 'contract' });
  const members = createPlatformApi(
    '',
    async () =>
      response([{ organizationId: user, role: 'VIEWER', status: 'ACTIVE' }]),
    org,
    user,
  );
  await expect(members.members()).rejects.toMatchObject({ kind: 'contract' });
});
test('membership creation uses POST with CSRF and only the supplied existing user ID', async () => {
  const transport = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })
      : response({
          id: user,
          organizationId: org,
          userId: user,
          role: 'VIEWER',
          status: 'INVITED',
        }),
  );
  const api = createPlatformApi('', transport, org, user);
  await api.createMember(user);
  expect(transport.mock.calls[1][1]).toMatchObject({
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': 'fixture' },
    body: JSON.stringify({ userId: user }),
  });
});
test('profile update exposes only supported name fields and API denial stays explicit', async () => {
  const transport = vi.fn<typeof fetch>(async (input) =>
    String(input).endsWith('/csrf')
      ? response({ headerName: 'X-CSRF-TOKEN', token: 'fixture' })
      : response({}, 403),
  );
  const api = createPlatformApi('', transport, org, user);
  await expect(api.saveProfile('A', 'B')).rejects.toMatchObject({
    kind: 'forbidden',
  });
  expect(transport.mock.calls[1][1]?.body).toBe(
    JSON.stringify({ firstName: 'A', lastName: 'B' }),
  );
});
