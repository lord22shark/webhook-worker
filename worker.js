/**
 * External Dependencies
 */ 
const axios = require('axios');
const {parentPort, workerData} = require('worker_threads');

/**
 * 
 */
parentPort.on('message', (__message) => {

	const eType = __message.event;

	if (eType) {

		switch (eType) {

			case 'clearTimeout':

				clearTimeout(__message.data);

			break;

		}
	
	}

});

/**
 * 
 */ 
async function webhookRequester (__data) {

	if (__data.tries === 0) {

		parentPort.postMessage({
			event: 'finished',
			data: __data
		});

		process.exit(1);

	} else {

		const attempt = (__data.total - __data.tries);

		const wait = (__data.response.length === 0) ? 0 : ((__data.wait === null) ? (1250 + (1000 * Math.pow(attempt, 4))) : __data.wait);

		parentPort.postMessage({
			event: 'logger',
			data: {
				id: __data.id,
				level: 'INFO',
				message: `Webhook Worker for ${__data.request.url} concerning ${__data.id} will request the ${attempt} attempt in ${wait} seconds...`,
				label: 'webhook-worker',
				timestamp: new Date().toISOString(),
				payload: null
			}
		});

		const timeoutID = setTimeout(async () => {

			parentPort.postMessage({
				event: 'logger',
				data: {
					id: __data.id,
					level: 'INFO',
					message: `Webhook Worker for ${__data.request.url} concerning ${__data.id} setTimeout thread ID is ${timeoutID._idleStart}`,
					label: 'webhook-worker',
					timestamp: new Date().toISOString(),
					payload: timeoutID._idleStart
				}
			});

			try {

				const response = await axios(__data.request);

				let body = null;

				if (typeof(response.data) === 'object') {

					body = response.data;

				} else {

					let header = null;

					for (const key of ['Content-Type', 'content-type', 'Content-type']) {

						if ((response.headers.hasOwnProperty(key)) && (response.headers[key])) {

							header = response.headers[key];

							break;

						}

					}

					if (header === 'application/json') {

						try {

							body = JSON.parse(response.data);

						} catch (parseError) {

							body = response.data;

						}

					}

				}

				__data.response.push(body);

				__data.status.push(response.status);

				if (response.status.toString().startsWith('2')) {

					__data.success = true;

					parentPort.postMessage({
						event: 'finished',
						data: __data
					});
					
					process.exit(0);

				}

			} catch (httpError) {

				const responseError = httpError.response;

				__data.status.push((responseError) ? responseError.status : 500);
				
				__data.response.push((responseError) ? responseError.data : httpError);

				__data.tries -= 1;

				parentPort.postMessage({
					event: 'logger',
					data: {
						id: __data.id,
						level: 'ERROR',
						message: `Webhook Worker for ${__data.request.url} concerning ${__data.id} received an error response. Remaining ${__data.tries} attempts...`,
						label: 'webhook-worker',
						timestamp: new Date().toISOString(),
						payload: {
							thread: timeoutID._idleStart,
							error: (responseError) ? responseError.data : httpError.toString()
						}
					}
				});

				await webhookRequester(__data);

			}

		}, wait);

	}

};

(async () => {

	await webhookRequester(workerData);

})();
