import type { INodeProperties } from 'n8n-workflow';
import { API_PREFIX, handleErrors, operationField, retryOnly, showFor } from './shared';

export const youtubeDescription: INodeProperties[] = [
	operationField(
		'youtube',
		[
			{
				name: 'Get Video',
				value: 'getVideo',
				action: 'Get a YouTube video',
				description: 'Get video metadata, chapters, captions and suggested videos. Costs 1 credit. Charged only on a 200 response; cached repeats from the same key are free.',
				routing: {
					request: { method: 'POST', url: `${API_PREFIX}/youtube/video` },
					output: { postReceive: [handleErrors] },
					operations: { pagination: retryOnly },
					// n8n only calls the pagination hook (our retry) when send.paginate is true.
					send: { paginate: true },
				},
			},
		],
		'getVideo',
	),
	{
		displayName: 'Identify Video By',
		name: 'videoIdentifier',
		type: 'options',
		options: [
			{ name: 'URL', value: 'url' },
			{ name: 'Video ID', value: 'video_id' },
		],
		default: 'url',
		displayOptions: showFor('youtube', 'getVideo'),
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.youtube.com/watch?v=Y2Ah_DFr8cw',
		displayOptions: {
			show: { resource: ['youtube'], operation: ['getVideo'], videoIdentifier: ['url'] },
		},
		routing: { send: { type: 'query', property: 'url' } },
	},
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'Y2Ah_DFr8cw',
		description: '11 characters: letters, digits, "-" and "_"',
		displayOptions: {
			show: { resource: ['youtube'], operation: ['getVideo'], videoIdentifier: ['video_id'] },
		},
		routing: { send: { type: 'query', property: 'video_id' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('youtube', 'getVideo'),
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en',
				description:
					'Two-letter code (en, es, fr…). Affects YouTube’s own text such as view counts and dates. A different language is a separate lookup.',
				routing: { send: { type: 'query', property: 'language' } },
			},
		],
	},
];
