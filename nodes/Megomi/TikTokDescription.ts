import type {
	IExecutePaginationFunctions,
	INodeExecutionData,
	INodeProperties,
	DeclarativeRestApiSettings,
	PostReceiveAction,
} from 'n8n-workflow';
import { API_PREFIX, handleErrors, operationField, requestWithRetry, retryOnly, showFor } from './shared';

const route = (url: string, extra: Record<string, unknown> = {}, output: PostReceiveAction[] = []) => ({
	request: { method: 'POST' as const, url: `${API_PREFIX}${url}` },
	output: { postReceive: [handleErrors, ...output] },
	operations: { pagination: retryOnly },
	// n8n only calls the pagination hook (retry / cursor paging) when send.paginate is true.
	send: { paginate: true },
	...extra,
});

/**
 * Comments are paged by an offset cursor: send `cursor`, read `has_more` and
 * `next_cursor` from the response, repeat until `has_more` is 0. Return All
 * walks every page; otherwise stops once `limit` comments are collected.
 */
export async function paginateComments(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', false) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', 50) as number);

	const results: INodeExecutionData[] = [];
	let cursor: string | undefined;

	do {
		requestOptions.options.qs = { ...(requestOptions.options.qs ?? {}) };
		if (cursor !== undefined) requestOptions.options.qs.cursor = cursor;

		const pages = await requestWithRetry.call(this, requestOptions);
		const body = (pages[0]?.json ?? {}) as {
			comments?: unknown[];
			has_more?: number;
			next_cursor?: string | number;
		};

		for (const comment of body.comments ?? []) {
			results.push({ json: comment as INodeExecutionData['json'] });
			if (results.length >= limit) return results;
		}

		cursor =
			body.has_more === 1 && body.next_cursor !== undefined ? String(body.next_cursor) : undefined;
	} while (cursor !== undefined);

	return results;
}

const videoInputHelp = 'Video URL, share link (vt.tiktok.com, vm.tiktok.com) or bare video ID';

export const tiktokDescription: INodeProperties[] = [
	operationField(
		'tiktok',
		[
			{
				name: 'Get Comments',
				value: 'getComments',
				action: 'Get comments of a TikTok video',
				description: 'Get comments or replies. Costs 1 credit per page of 20; empty pages are free. Charged only on a 200 response.',
				routing: route('/tiktok/comments', {
					operations: { pagination: paginateComments },
				}),
			},
			{
				name: 'Get Profile',
				value: 'getProfile',
				action: 'Get a TikTok profile',
				description: 'Get profile and stats. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: route('/tiktok/profile'),
			},
			{
				name: 'Get Song',
				value: 'getSong',
				action: 'Get a TikTok song',
				description: 'Get sound details. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: route('/tiktok/song'),
			},
			{
				name: 'Get Transcript',
				value: 'getTranscript',
				action: 'Get the transcript of a TikTok video',
				description: 'Get captions as WebVTT. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: route('/tiktok/transcript'),
			},
			{
				name: 'Get Trending Feed',
				value: 'getTrendingFeed',
				action: 'Get the TikTok trending feed',
				description: 'Get one page of trending videos; every call returns a new page. Costs 1 credit per page. Charged only on a 200 response.',
				routing: route('/tiktok/trending/feed', {}, [
					{ type: 'rootProperty', properties: { property: 'aweme_list' } },
				]),
			},
			{
				name: 'Get Trending Hashtags',
				value: 'getTrendingHashtags',
				action: 'Get TikTok trending hashtags',
				description: 'Get trending hashtags by country and period. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: route('/tiktok/trending/hashtags'),
			},
			{
				name: 'Get Video',
				value: 'getVideo',
				action: 'Get a TikTok video',
				description: 'Get video details and stats. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: route('/tiktok/video'),
			},
		],
		'getVideo',
	),

	// ---- Get Video ----
	{
		displayName: 'Extended Response',
		name: 'extendedResponse',
		type: 'boolean',
		default: false,
		description:
			'Whether to use the extended response (video URL sent as a query parameter). Enables the extra options below.',
		displayOptions: showFor('tiktok', 'getVideo'),
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.tiktok.com/@creator/video/7123456789012345678',
		description: videoInputHelp,
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getVideo'], extendedResponse: [false] },
		},
		routing: { send: { type: 'body', property: 'videoUrl' } },
	},
	{
		displayName: 'Video URL',
		name: 'videoUrlExtended',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.tiktok.com/@creator/video/7123456789012345678',
		description: videoInputHelp,
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getVideo'], extendedResponse: [true] },
		},
		routing: { send: { type: 'query', property: 'url' } },
	},
	{
		displayName: 'Extended Options',
		name: 'extendedOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getVideo'], extendedResponse: [true] },
		},
		options: [
			{
				displayName: 'Get Transcript',
				name: 'getTranscript',
				type: 'boolean',
				default: false,
				description: 'Whether to include WebVTT captions (or null)',
				routing: { send: { type: 'query', property: 'get_transcript' } },
			},
			{
				displayName: 'Include Creator Details',
				name: 'includeCreator',
				type: 'boolean',
				default: false,
				description: 'Whether to add seller, business and organization flags on the author',
				routing: { send: { type: 'query', property: 'include_creator' } },
			},
			{
				displayName: 'Include Products',
				name: 'includeProducts',
				type: 'boolean',
				default: false,
				description:
					'Whether to add price, SKUs, sales, rating and reviews of linked products. Makes Trim Response ignored.',
				routing: { send: { type: 'query', property: 'include_products' } },
			},
			{
				displayName: 'Include Song Details',
				name: 'includeSong',
				type: 'boolean',
				default: false,
				description: 'Whether to add user_count on the song',
				routing: { send: { type: 'query', property: 'include_song' } },
			},
			{
				displayName: 'Trim Response',
				name: 'trim',
				type: 'boolean',
				default: false,
				description: 'Whether to return a smaller aweme_detail',
				routing: { send: { type: 'query', property: 'trim' } },
			},
		],
	},

	// ---- Get Transcript ----
	{
		displayName: 'Video URL',
		name: 'transcriptUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.tiktok.com/@creator/video/7123456789012345678',
		description: `${videoInputHelp}. Photo posts are not supported.`,
		displayOptions: showFor('tiktok', 'getTranscript'),
		routing: { send: { type: 'query', property: 'url' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('tiktok', 'getTranscript'),
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'en',
				description:
					'Two-letter ISO 639-1 code. Leave empty for the video’s own captions. If unavailable, the result falls back to the original language (result.fallback = true).',
				routing: { send: { type: 'query', property: 'language' } },
			},
		],
	},

	// ---- Get Profile ----
	{
		displayName: 'Identify Profile By',
		name: 'profileIdentifier',
		type: 'options',
		options: [
			{ name: 'Username', value: 'handle' },
			{ name: 'User ID', value: 'userId' },
		],
		default: 'handle',
		displayOptions: showFor('tiktok', 'getProfile'),
	},
	{
		displayName: 'Username',
		name: 'handle',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'nasa',
		description: 'TikTok handle. A leading @ or a profile URL also works.',
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getProfile'], profileIdentifier: ['handle'] },
		},
		routing: { send: { type: 'body', property: 'handle' } },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description: 'Numeric user ID or secUid (starts with MS4wLjABAAAA)',
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getProfile'], profileIdentifier: ['userId'] },
		},
		routing: { send: { type: 'body', property: 'userId' } },
	},

	// ---- Get Song ----
	{
		displayName: 'Clip ID',
		name: 'clipId',
		type: 'string',
		required: true,
		default: '',
		placeholder: '6717159721276540930',
		description:
			'TikTok clip/music ID (not a song ID). A sound URL or sound share link also works.',
		displayOptions: showFor('tiktok', 'getSong'),
		routing: { send: { type: 'body', property: 'clipId' } },
	},

	// ---- Get Comments ----
	{
		displayName: 'Video URL',
		name: 'commentsUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.tiktok.com/@creator/video/7123456789012345678',
		description: `${videoInputHelp}. Photo post URLs work too.`,
		displayOptions: showFor('tiktok', 'getComments'),
		routing: { send: { type: 'query', property: 'url' } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: showFor('tiktok', 'getComments'),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { resource: ['tiktok'], operation: ['getComments'], returnAll: [false] },
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('tiktok', 'getComments'),
		options: [
			{
				displayName: 'Replies To Comment ID',
				name: 'commentId',
				type: 'string',
				default: '',
				description: 'A comment’s cid. Returns that comment’s replies instead of the post’s comments.',
				routing: { send: { type: 'query', property: 'comment_id' } },
			},
			{
				displayName: 'Trim Response',
				name: 'trim',
				type: 'boolean',
				default: false,
				description: 'Whether to return a smaller comment object',
				routing: { send: { type: 'query', property: 'trim' } },
			},
		],
	},

	// ---- Get Trending Hashtags ----
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('tiktok', 'getTrendingHashtags'),
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				placeholder: 'Games',
				description:
					'One of the 16 TikTok categories (name or ID). Cannot be combined with "Merged List By Category" set to true.',
				routing: { send: { type: 'query', property: 'category' } },
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: 'US',
				description:
					'Two-letter country code. Supported: AE, AR, AU, BR, CA, CO, DE, EG, ES, FR, GB, ID, IL, IT, JP, KR, MX, MY, PH, SA, SG, TH, TR, TW, US, VN, ZA.',
				routing: { send: { type: 'query', property: 'country' } },
			},
			{
				displayName: 'Merged List By Category',
				name: 'byCategory',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a merged list (~45 hashtags). Off returns the single all-categories ranking of 3 hashtags.',
				routing: { send: { type: 'query', property: 'by_category' } },
			},
			{
				displayName: 'Period',
				name: 'period',
				type: 'options',
				options: [
					{ name: '7 Days', value: 7 },
					{ name: '30 Days', value: 30 },
				],
				default: 7,
				routing: { send: { type: 'query', property: 'period' } },
			},
		],
	},

	// ---- Get Trending Feed ----
	{
		displayName: 'Region',
		name: 'region',
		type: 'string',
		required: true,
		default: 'US',
		description:
			'Two-letter code. Required by the API but ignored: every request is served from one fixed location.',
		displayOptions: showFor('tiktok', 'getTrendingFeed'),
		routing: { send: { type: 'query', property: 'region' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('tiktok', 'getTrendingFeed'),
		options: [
			{
				displayName: 'Trim Response',
				name: 'trim',
				type: 'boolean',
				default: false,
				description: 'Whether to return a smaller item (no sound, hashtags and sharing settings)',
				routing: { send: { type: 'query', property: 'trim' } },
			},
		],
	},
];
