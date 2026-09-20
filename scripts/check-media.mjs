import assert from 'node:assert/strict';
import pg from 'pg';

// Run only against the dedicated disposable local release database and server.
const base = process.env.BASE_URL || 'http://127.0.0.1:3107';
const db = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname.startsWith('/arkivel_vistara_release_'));
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const pool = new pg.Pool({ connectionString: db.href });
let cookie = '';
async function request(path, method = 'GET', body, status = 200, authed = true) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authed ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  if (path === '/api/auth/login') cookie = response.headers.get('set-cookie').split(';')[0];
  return data;
}
const library = () => request('/api/media/library');
const movie = (id, moods = []) => ({ id: `source-${id}`, tmdb_id: id, media_type: 'movie', title: `Release fixture ${id}`, poster_path: '/fixture.jpg', status: 'watched', moods, added_at: '2025-01-04T15:16:17.000Z', watched_at: '2025-02-05T16:17:18.000Z', metadata: { id, media_type: 'movie', title: `Release fixture ${id}`, overview: 'Original offline description', poster_path: '/fixture.jpg', vote_average: 7.3, release_date: '2020-03-04', runtime: 123, genres: [{ id: 1, name: 'Drama' }], backdrop_path: '/backdrop.jpg' } });
let schemaToRestore;
try {
  await request('/api/media/watchlist', 'POST', {}, 401, false);
  await request('/api/auth/login', 'POST', { username: 'smoke-admin', password: process.env.SMOKE_ADMIN_PASSWORD || 'arkivel-smoke-admin' });
  await request('/api/admin/kits/apply', 'POST', { kit: 'watchlist' });
  assert.equal((await request('/api/media/health')).can_edit, true);
  assert.equal((await request('/api/media/health', 'GET', undefined, 200, false)).can_edit, false);
  const titles = await request('/api/media/titles?q=Severance');
  assert(titles.some(title => title.id === 95396));
  const saved = await request('/api/media/watchlist', 'POST', { tmdb_id: 95396, media_type: 'tv', title: 'Severance' }, 201);
  await request(`/api/media/watchlist/${saved.id}`, 'PATCH', { status: 'watching', moods: ['Dark'] });
  await request(`/api/media/watchlist/${saved.id}/episodes`, 'POST', { episodes: [{ season_number: 1, episode_number: 1 }] }, 201);
  assert((await request(`/api/media/watchlist/${saved.id}/episodes`)).some(mark => mark.episode_number === 1));
  assert(Array.isArray((await request('/api/media/mood', 'POST', { mood: 'Dark', count: 4 })).recommendations));
  const id = 900000000 + Math.floor(Math.random() * 1000000);
  const show = { ...movie(id + 1), media_type: 'tv', status: 'watching', watched_at: null, metadata: undefined };
  const backup = { version: 1, items: [movie(id), show], episodes: [{ id: 'source-mark', watchlist_item_id: show.id, season_number: 2, episode_number: 3, watched_at: '2025-04-05T16:17:18.000Z' }] };
  const before = await library();
  const preview = await request('/api/media/library', 'POST', { backup });
  assert.deepEqual(await library(), before);
  assert.deepEqual(preview, { added: 2, existing: 0, episodesAdded: 1, episodesExisting: 0 });
  assert.deepEqual(await request('/api/media/library', 'PUT', { backup }), preview);
  const restored = await library();
  const actual = restored.items.find(item => item.tmdb_id === id);
  assert.equal(actual.added_at, backup.items[0].added_at);
  assert.equal(actual.watched_at, backup.items[0].watched_at);
  assert.equal(actual.poster_path, '/fixture.jpg');
  assert.equal(actual.metadata.overview, 'Original offline description');
  assert.equal(actual.metadata.release_date, '2020-03-04');
  assert.equal(actual.metadata.runtime, 123);
  const detail = await request(`/api/media/tmdb/${id}?type=movie`);
  assert.equal(detail.source, 'library');
  assert.equal(detail.tmdb.overview, 'Original offline description');
  const actualShow = restored.items.find(item => item.tmdb_id === id + 1);
  assert.equal(restored.episodes.find(mark => mark.watchlist_item_id === actualShow.id).watched_at, backup.episodes[0].watched_at);
  await request(`/api/media/watchlist/${actual.id}`, 'PATCH', { status: 'dropped' });
  assert.deepEqual(await request('/api/media/library', 'PUT', { backup }), { added: 0, existing: 2, episodesAdded: 0, episodesExisting: 1 });
  assert.equal((await library()).items.find(item => item.id === actual.id).status, 'dropped');
  // Force the second insert to fail schema validation and prove the first insert rolls back.
  schemaToRestore = (await pool.query('SELECT id, schema FROM "Collection" WHERE slug = $1', ['watchlist'])).rows[0];
  const altered = schemaToRestore.schema.map(field => field.id === 'moods' ? { ...field, options: field.options.filter(option => option.id !== 'dark') } : field);
  await pool.query('UPDATE "Collection" SET schema = $1 WHERE id = $2', [JSON.stringify(altered), schemaToRestore.id]);
  await request('/api/media/library', 'PUT', { backup: { version: 1, items: [movie(id + 2), movie(id + 3, ['Dark'])], episodes: [] } }, 400);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM "CollectionItem" WHERE properties->>\'tmdb\' = ANY($1)', [[`movie:${id + 2}`, `movie:${id + 3}`]])).rows[0].count, 0);
  console.log('Media checks passed: auth, kit, discovery, status, episodes, mood, preview isolation, backup dates/metadata, idempotence, existing-value preservation, and transaction rollback.');
} finally {
  if (schemaToRestore) await pool.query('UPDATE "Collection" SET schema = $1 WHERE id = $2', [JSON.stringify(schemaToRestore.schema), schemaToRestore.id]);
  await pool.end();
}
