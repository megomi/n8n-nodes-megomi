import type { INodeProperties } from 'n8n-workflow';
import { API_PREFIX, handleErrors, operationField, retryOnly, showFor } from './shared';

const post = (url: string) => ({
	request: { method: 'POST' as const, url: `${API_PREFIX}${url}` },
	output: { postReceive: [handleErrors] },
	operations: { pagination: retryOnly },
	// n8n only calls the pagination hook (our retry) when send.paginate is true.
	send: { paginate: true },
});

export const threadsDescription: INodeProperties[] = [
	operationField(
		'threads',
		[
			{
				name: 'Get Post',
				value: 'getPost',
				action: 'Get a Threads post',
				description: 'Get a post with its replies. Costs 1 credit (0 if the replies could not be read). Charged only on a 200 response.',
				routing: post('/threads/post'),
			},
			{
				name: 'Get Profile',
				value: 'getProfile',
				action: 'Get a Threads profile',
				description: 'Get a profile. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: post('/threads/profile'),
			},
		],
		'getPost',
	),
	{
		displayName: 'Post URL',
		name: 'postUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.threads.com/@username/post/CODE',
		displayOptions: showFor('threads', 'getPost'),
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('threads', 'getPost'),
		options: [
			{
				displayName: 'Include Related Posts',
				name: 'includeRelated',
				type: 'boolean',
				default: false,
				description:
					'Whether to add related posts to the result. No extra charge, but may take longer.',
				routing: { send: { type: 'query', property: 'include_related' } },
			},
		],
	},
	{
		displayName: 'Username',
		name: 'handle',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'sportsillustrated',
		description: '1–30 characters: letters, digits, "." and "_". A leading @ is removed.',
		displayOptions: showFor('threads', 'getProfile'),
		routing: { send: { type: 'query', property: 'handle' } },
	},
];
