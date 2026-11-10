// Contract test: every operation must match the public API docs
// (https://www.megomi.my.id/docs/): URL, method and where each parameter is sent.
// Update CONTRACT only when the documented API changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Megomi } from '../dist/nodes/Megomi/Megomi.node.js';
import { MegomiApi } from '../dist/credentials/MegomiApi.credentials.js';

const node = new Megomi().description;

// resource.operation -> { url, params: { <field param name>: [where, apiName] } }
const CONTRACT = {
	'tiktok.getVideo': { url: '/api/v1/tiktok/video', send: [['body', 'videoUrl'], ['query', 'url'], ['query', 'get_transcript'], ['query', 'include_creator'], ['query', 'include_products'], ['query', 'include_song'], ['query', 'trim']] },
	'tiktok.getTranscript': { url: '/api/v1/tiktok/transcript', send: [['query', 'url'], ['query', 'language']] },
	'tiktok.getProfile': { url: '/api/v1/tiktok/profile', send: [['body', 'handle'], ['body', 'userId']] },
	'tiktok.getComments': { url: '/api/v1/tiktok/comments', send: [['query', 'url'], ['query', 'comment_id'], ['query', 'trim']], paginated: true },
	'tiktok.getTrendingHashtags': { url: '/api/v1/tiktok/trending/hashtags', send: [['query', 'category'], ['query', 'country'], ['query', 'by_category'], ['query', 'period']] },
	'tiktok.getTrendingFeed': { url: '/api/v1/tiktok/trending/feed', send: [['query', 'region'], ['query', 'trim']] },
	'tiktok.getSong': { url: '/api/v1/tiktok/song', send: [['body', 'clipId']] },
	'instagram.getPost': { url: '/api/v1/instagram/post', send: [['body', 'url'], ['body', 'shortcode'], ['query', 'url'], ['query', 'download_media'], ['query', 'trim']] },
	'instagram.getProfile': { url: '/api/v1/instagram/profile', send: [['body', 'handle'], ['body', 'url']] },
	'threads.getPost': { url: '/api/v1/threads/post', send: [['body', 'url'], ['query', 'include_related']] },
	'threads.getProfile': { url: '/api/v1/threads/profile', send: [['query', 'handle']] },
	'youtube.getVideo': { url: '/api/v1/youtube/video', send: [['query', 'url'], ['query', 'video_id'], ['query', 'language']] },
};

const flatten = (props) =>
	props.flatMap((p) => [p, ...(p.type === 'collection' ? p.options : [])]);

const appliesTo = (p, resource, operation) => {
	const show = p.displayOptions?.show;
	if (!show) return false;
	return show.resource?.includes(resource) && show.operation?.includes(operation);
};

test('node covers exactly the documented operations', () => {
	const found = [];
	for (const p of node.properties) {
		if (p.name !== 'operation') continue;
		for (const o of p.options) found.push(`${p.displayOptions.show.resource[0]}.${o.value}`);
	}
	assert.deepEqual(found.sort(), Object.keys(CONTRACT).sort());
});

for (const [key, spec] of Object.entries(CONTRACT)) {
	const [resource, operation] = key.split('.');

	test(`${key}: url, method, parameters`, () => {
		const opField = node.properties.find(
			(p) => p.name === 'operation' && p.displayOptions.show.resource[0] === resource,
		);
		const op = opField.options.find((o) => o.value === operation);

		assert.equal(op.routing.request.method, 'POST');
		assert.equal(op.routing.request.url, spec.url);
		assert.ok(op.routing.output.postReceive.length >= 1, 'error handler is registered');
		assert.match(op.description, /credit/i, 'description states the credit cost');
		assert.equal(typeof op.routing.operations?.pagination, 'function', 'retry hook is registered');
		assert.equal(op.routing.operations.pagination.name === 'paginateComments', Boolean(spec.paginated));

		const sent = flatten(node.properties)
			.filter((p) => p.routing?.send && (appliesTo(p, resource, operation) || p._nested))
			.map((p) => [p.routing.send.type, p.routing.send.property]);
		// options collections: their children carry the routing
		const collections = node.properties.filter(
			(p) => p.type === 'collection' && appliesTo(p, resource, operation),
		);
		for (const c of collections)
			for (const child of c.options) sent.push([child.routing.send.type, child.routing.send.property]);

		const norm = (a) => a.map((x) => x.join(':')).sort();
		assert.deepEqual(norm([...new Set(sent.map((s) => s.join(':')))].map((s) => s.split(':'))), norm(spec.send));
	});
}

test('node defaults: 60s timeout, status errors handled by the node', () => {
	assert.equal(node.requestDefaults.timeout, 60000);
	assert.equal(node.requestDefaults.ignoreHttpStatusErrors, true);
	assert.equal(node.requestDefaults.baseURL, '={{$credentials.baseUrl}}');
});

test('credential: Bearer auth, default base URL, free test endpoint', () => {
	const c = new MegomiApi();
	assert.equal(c.authenticate.properties.headers.Authorization, '=Bearer {{$credentials.apiKey}}');
	assert.equal(c.properties.find((p) => p.name === 'baseUrl').default, 'https://api.megomi.my.id');
	assert.equal(c.test.request.url, '/api/v1/credits/packages');
	assert.equal(c.test.request.method, 'GET');
});

// ---- retry behaviour (only 429/503, honours Retry-After) ----
import { requestWithRetry, handleErrors, MAX_RETRIES } from '../dist/nodes/Megomi/shared.js';

const fail = (status, retryAfter) => {
	const e = new Error(`HTTP ${status}`);
	if (status === 429 || status === 503) e.retryAfterSeconds = retryAfter ?? 0.001;
	return e;
};

test('retry: 503 then success returns the result', async () => {
	let calls = 0;
	const node_ = { name: 'Megomi', type: 'megomi', typeVersion: 1, position: [0, 0], parameters: {}, id: 'x' };
	const ctx = { getNode: () => node_, makeRoutingRequest: async () => (++calls < 3 ? Promise.reject(fail(503)) : [{ json: { ok: 1 } }]) };
	const out = await requestWithRetry.call(ctx, {});
	assert.equal(calls, 3);
	assert.deepEqual(out, [{ json: { ok: 1 } }]);
});

test('retry: gives up after MAX_RETRIES retries', async () => {
	let calls = 0;
	const node_ = { name: 'Megomi', type: 'megomi', typeVersion: 1, position: [0, 0], parameters: {}, id: 'x' };
	const ctx = { getNode: () => node_, makeRoutingRequest: async () => { calls++; throw fail(429); } };
	await assert.rejects(() => requestWithRetry.call(ctx, {}));
	assert.equal(calls, MAX_RETRIES + 1);
});

test('retry: never retries other statuses (400, 402, 403, 404, 500)', async () => {
	for (const status of [400, 401, 402, 403, 404, 500]) {
		let calls = 0;
		const node_ = { name: 'Megomi', type: 'megomi', typeVersion: 1, position: [0, 0], parameters: {}, id: 'x' };
	const ctx = { getNode: () => node_, makeRoutingRequest: async () => { calls++; throw fail(status); } };
		await assert.rejects(() => requestWithRetry.call(ctx, {}));
		assert.equal(calls, 1, `status ${status} must not be retried`);
	}
});

test('handleErrors: marks only 429/503 as retryable and reads Retry-After', async () => {
	const ctx = { getNode: () => ({ name: 'Megomi', type: 'megomi', typeVersion: 1, position: [0, 0], parameters: {}, id: 'x' }) };
	const run = (statusCode, headers = {}) =>
		handleErrors.call(ctx, [], { statusCode, headers, body: { detail: 'x' } }).then(
			() => null,
			(e) => e,
		);

	assert.equal((await run(503, { 'retry-after': '7' })).retryAfterSeconds, 7);
	assert.equal((await run(429)).retryAfterSeconds, 5);
	for (const s of [400, 401, 402, 403, 404, 500])
		assert.equal((await run(s, { 'retry-after': '7' })).retryAfterSeconds, undefined);
	assert.deepEqual(await handleErrors.call(ctx, [{ json: {} }], { statusCode: 200, headers: {}, body: {} }), [{ json: {} }]);
});

test('every operation is wrapped by the retry pagination hook', () => {
	for (const p of node.properties.filter((p) => p.name === 'operation'))
		for (const o of p.options)
			assert.equal(typeof o.routing.operations?.pagination, 'function', `${p.displayOptions.show.resource[0]}.${o.value}`);
});

// ---- icons referenced by the node and credential must exist in the build ----
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

test('icons referenced by node and credential exist', () => {
	const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const refs = [
		[node.icon.light, 'dist/nodes/Megomi'],
		[node.icon.dark, 'dist/nodes/Megomi'],
		[new MegomiApi().icon, 'dist/credentials'],
	];
	for (const [ref, base] of refs) {
		const file = resolve(root, base, String(ref).replace(/^file:/, ''));
		assert.ok(existsSync(file), `missing icon: ${file}`);
	}
});

// n8n-core's RoutingNode only invokes `operations.pagination` (our retry and the
// comments cursor paging) when `routing.send.paginate` is truthy. Without it the
// hook is silently skipped, so every operation must set it.
test('every operation enables the pagination hook (send.paginate)', () => {
	for (const p of node.properties.filter((p) => p.name === 'operation'))
		for (const o of p.options)
			assert.equal(o.routing.send?.paginate, true, `${p.displayOptions.show.resource[0]}.${o.value}`);
});
