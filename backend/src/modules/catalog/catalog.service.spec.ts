import { describe, expect, it, vi } from 'vitest';
import { CatalogService } from './catalog.service.js';

function fixture(error: { code: string } | null = null) {
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: { items: [], total: 0 }, error });
  return {
    service: new CatalogService({ getAdminClient: () => ({ rpc }) } as never),
    rpc,
  };
}
describe('catalog API scope and validation', () => {
  it('does not call privileged RPC for learner authoring requests', async () => {
    const { service, rpc } = fixture();
    await expect(
      service.page('questions', { id: 'learner', role: 'learner' }, {}),
    ).rejects.toMatchObject({ status: 403 });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('uses JWT actor and an allow-list of filters, ignoring supplied actor/scope', async () => {
    const { service, rpc } = fixture();
    await service.page(
      'courses',
      { id: 'real-user', role: 'learner' },
      {
        page: '2',
        page_size: '9',
        search: 'C#',
        p_actor_id: 'admin',
        scope: 'manager',
      },
    );
    expect(rpc).toHaveBeenCalledWith('content_catalog_page', {
      p_kind: 'courses',
      p_actor_id: 'real-user',
      p_page: 2,
      p_page_size: 9,
      p_filters: { search: 'C#' },
    });
  });
  it('rejects unsupported kinds and oversized/fractional pagination', async () => {
    const { service, rpc } = fixture();
    const actor = { id: 'manager', role: 'content_manager' };
    await expect(service.page('profiles', actor, {})).rejects.toMatchObject({
      status: 400,
    });
    for (const filters of [
      { page: '1.5' },
      { page_size: '51' },
      { page: '1000001' },
    ]) {
      await expect(
        service.page('courses', actor, filters),
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it('reports backend failures instead of a successful empty list', async () => {
    const { service } = fixture({ code: 'XX000' });
    await expect(
      service.page('courses', { id: 'manager', role: 'content_manager' }, {}),
    ).rejects.toMatchObject({ status: 500 });
  });
});
