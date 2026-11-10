import {
	NodeApiError,
	sleep,
	type DeclarativeRestApiSettings,
	type IExecutePaginationFunctions,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
} from 'n8n-workflow';

export const API_PREFIX = '/api/v1';

/** Maps Megomi API error statuses to messages a user can act on. */
const ERROR_MESSAGES: Record<number, { message: string; description: string }> = {
	400: {
		message: 'Invalid or missing parameters',
		description: 'Check the input values for this operation. The request was not charged.',
	},
	401: {
		message: 'Invalid API key',
		description: 'Check the API key in your Megomi credential.',
	},
	402: {
		message: 'Not enough credits',
		description: 'Top up your credit balance in the Megomi dashboard.',
	},
	403: {
		message: 'The source platform blocked this lookup',
		description:
			'The platform returned a captcha, login wall or age-gate. You were not charged. Try again in a few minutes.',
	},
	404: {
		message: 'Not found',
		description:
			'The target does not exist, is private, or was deleted. You were not charged. Results are cached for about an hour.',
	},
	429: {
		message: 'Rate limit reached',
		description:
			'Too many requests. You were not charged. The node already retried twice; wait a moment before running again.',
	},
	500: {
		message: 'Unexpected server error',
		description: 'Try again later.',
	},
	503: {
		message: 'No result within the wait window',
		description:
			'You were not charged. The node already retried twice. The lookup may still be running, so running the node again shortly usually returns the result for free.',
	},
};

/**
 * First postReceive step of every operation. The node sets
 * `ignoreHttpStatusErrors`, so non-2xx responses arrive here and are turned
 * into readable errors.
 */
export async function handleErrors(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = response.statusCode;
	if (status >= 200 && status < 300) return items;

	const known = ERROR_MESSAGES[status];
	const body = (response.body ?? {}) as JsonObject;
	const apiDetail = typeof body.detail === 'string' ? body.detail : undefined;

	const error = new NodeApiError(this.getNode(), body, {
		message: known?.message ?? `Megomi API error (${status})`,
		description: [known?.description, apiDetail].filter(Boolean).join(' — ') || undefined,
		httpCode: String(status),
	});

	// 429 and 503 are never charged, so they are the only statuses worth retrying.
	if (RETRYABLE_STATUS.has(status)) {
		const header = response.headers?.['retry-after'];
		const seconds = Number(Array.isArray(header) ? header[0] : header);
		Object.assign(error, {
			retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_RETRY_SECONDS,
		});
	}
	throw error;
}

const RETRYABLE_STATUS = new Set([429, 503]);
const DEFAULT_RETRY_SECONDS = 5;
const MAX_RETRY_SECONDS = 20;
export const MAX_RETRIES = 2;

/**
 * Runs one routing request and retries only on 429/503 (never charged),
 * honouring Retry-After (capped). Every other error is thrown immediately,
 * so a charged or permanent failure is never repeated.
 */
export async function requestWithRetry(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await this.makeRoutingRequest(requestOptions);
		} catch (error) {
			const wait = (error as { retryAfterSeconds?: number }).retryAfterSeconds;
			if (wait === undefined || attempt >= MAX_RETRIES) {
				throw error instanceof NodeApiError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject);
			}
			await sleep(Math.min(wait, MAX_RETRY_SECONDS) * 1000);
		}
	}
}

/** Pagination hook for single-request operations: just adds the retry. */
export async function retryOnly(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	return requestWithRetry.call(this, requestOptions);
}

export const errorStep = { type: 'postReceive' as const, enabled: true, properties: {} };

export function showFor(resource: string, operation: string) {
	return { show: { resource: [resource], operation: [operation] } };
}

export function operationField(
	resource: string,
	options: INodeProperties['options'],
	def: string,
): INodeProperties {
	return {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options,
		default: def,
	};
}
