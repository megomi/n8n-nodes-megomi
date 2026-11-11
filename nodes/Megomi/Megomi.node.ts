import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { instagramDescription } from './InstagramDescription';
import { threadsDescription } from './ThreadsDescription';
import { tiktokDescription } from './TikTokDescription';
import { youtubeDescription } from './YoutubeDescription';

export class Megomi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Megomi',
		name: 'megomi',
		icon: { light: 'file:../../icons/megomi-logo.svg', dark: 'file:../../icons/megomi-logo.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get TikTok, Instagram, Threads and YouTube data from the Megomi API',
		defaults: { name: 'Megomi' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'megomiApi', required: true }],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			// The API waits up to 45s for a result (comments can take up to ~55s).
			timeout: 60000,
			// Non-2xx responses are translated into readable errors by handleErrors.
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Instagram', value: 'instagram' },
					// "Threads" is Meta's product name, not a plural noun.
					// eslint-disable-next-line n8n-nodes-base/node-param-resource-with-plural-option
					{ name: 'Threads', value: 'threads' },
					{ name: 'TikTok', value: 'tiktok' },
					{ name: 'YouTube', value: 'youtube' },
				],
				default: 'instagram',
			},
			...tiktokDescription,
			...instagramDescription,
			...threadsDescription,
			...youtubeDescription,
		],
	};
}
