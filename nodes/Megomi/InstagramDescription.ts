import type { INodeProperties } from 'n8n-workflow';
import { API_PREFIX, handleErrors, operationField, retryOnly, showFor } from './shared';

const post = (url: string, extra: object = {}) => ({
	request: { method: 'POST' as const, url: `${API_PREFIX}${url}`, ...extra },
	output: { postReceive: [handleErrors] },
	operations: { pagination: retryOnly },
	// n8n only calls the pagination hook (our retry) when send.paginate is true.
	send: { paginate: true },
});

export const instagramDescription: INodeProperties[] = [
	operationField(
		'instagram',
		[
			{
				name: 'Get Post',
				value: 'getPost',
				action: 'Get an Instagram post or reel',
				description: 'Get a post or reel. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: post('/instagram/post'),
			},
			{
				name: 'Get Profile',
				value: 'getProfile',
				action: 'Get an Instagram profile',
				description: 'Get a profile with recent posts and reels. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: post('/instagram/profile'),
			},
		],
		'getPost',
	),

	// ---- Get Post ----
	{
		displayName: 'Extended Response',
		name: 'extendedResponse',
		type: 'boolean',
		default: false,
		description:
			'Whether to use the extended response (post URL sent as a query parameter). Enables the extra options below; only a URL is accepted in this mode.',
		displayOptions: showFor('instagram', 'getPost'),
	},
	{
		displayName: 'Identify Post By',
		name: 'postIdentifier',
		type: 'options',
		options: [
			{ name: 'URL', value: 'url' },
			{ name: 'Shortcode', value: 'shortcode' },
		],
		default: 'url',
		displayOptions: {
			show: { resource: ['instagram'], operation: ['getPost'], extendedResponse: [false] },
		},
	},
	{
		displayName: 'Post URL',
		name: 'postUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.instagram.com/reel/DdG4RIxIPyf/',
		description: 'Instagram post or reel URL (/p/ or /reel/ form)',
		displayOptions: {
			show: {
				resource: ['instagram'],
				operation: ['getPost'],
				extendedResponse: [false],
				postIdentifier: ['url'],
			},
		},
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Shortcode',
		name: 'shortcode',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'DdG4RIxIPyf',
		displayOptions: {
			show: {
				resource: ['instagram'],
				operation: ['getPost'],
				extendedResponse: [false],
				postIdentifier: ['shortcode'],
			},
		},
		routing: { send: { type: 'body', property: 'shortcode' } },
	},
	{
		displayName: 'Post URL',
		name: 'postUrlExtended',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.instagram.com/reel/DdG4RIxIPyf/',
		description: 'Instagram post or reel URL (/p/ or /reel/ form)',
		displayOptions: {
			show: { resource: ['instagram'], operation: ['getPost'], extendedResponse: [true] },
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
			show: { resource: ['instagram'], operation: ['getPost'], extendedResponse: [true] },
		},
		options: [
			{
				displayName: 'Download Media',
				name: 'downloadMedia',
				type: 'boolean',
				default: false,
				description:
					'Whether to store the media and return permanent links. Costs 9 extra credits (10 total), charged only if every file is stored. Ignored at no charge if the service has it disabled.',
				routing: { send: { type: 'query', property: 'download_media' } },
			},
			{
				displayName: 'Trim Response',
				name: 'trim',
				type: 'boolean',
				default: false,
				description: 'Whether to return a smaller data.xdt_shortcode_media and omit extensions',
				routing: { send: { type: 'query', property: 'trim' } },
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
			{ name: 'URL', value: 'url' },
		],
		default: 'handle',
		displayOptions: showFor('instagram', 'getProfile'),
	},
	{
		displayName: 'Username',
		name: 'handle',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'nasa',
		description: 'Instagram username, with or without a leading @',
		displayOptions: {
			show: { resource: ['instagram'], operation: ['getProfile'], profileIdentifier: ['handle'] },
		},
		routing: { send: { type: 'body', property: 'handle' } },
	},
	{
		displayName: 'Profile URL',
		name: 'profileUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.instagram.com/nasa/',
		displayOptions: {
			show: { resource: ['instagram'], operation: ['getProfile'], profileIdentifier: ['url'] },
		},
		routing: { send: { type: 'body', property: 'url' } },
	},
];
