import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MegomiApi implements ICredentialType {
	name = 'megomiApi';

	displayName = 'Megomi API';

	icon = 'file:../icons/megomi-logo.svg' as const;

	documentationUrl = 'https://www.megomi.my.id/docs/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.megomi.my.id',
			description: 'Only change this if you use a self-hosted or staging Megomi API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /credits/packages lists purchasable packages; it only needs a valid key.
	// Confirm with the API owner that it never deducts credits.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/credits/packages',
			method: 'GET',
		},
	};
}
