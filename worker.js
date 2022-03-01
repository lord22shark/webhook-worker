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

		const wait = (__data.response.length === 0) ? 0 : ((__data.wait === null) ? (12500 + (1000 * Math.pow((__data.total - __data.tries), 4))) : __data.wait);

		parentPort.postMessage({
			event: 'logger',
			data: {
				level: 'info',
				message: `Webhook Worker for ${__data.request.url} will request the ${__data.tries} try in ${wait} seconds...`,
				label: 'webhook-worker',
				timestamp: new Date().toISOString()
			}
		});

		const timeoutID = setTimeout(async () => {

			parentPort.postMessage({
				event: 'logger',
				data: {
					level: 'info',
					message: `Webhook Worker for ${__data.request.url} setTimeout thread ID is ${timeoutID._idleStart}`,
					label: 'webhook-worker',
					timestamp: new Date().toISOString(),
					thread: timeoutID._idleStart
				}
			});

			try {

				const response = await axios(__data.request);

				__data.response.push(response.data);

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
						level: 'info',
						message: `Webhook Worker for ${__data.request.url} received an error response. Remaining ${__data.tries} tries...`,
						label: 'webhook-worker',
						timestamp: new Date().toISOString(),
						thread: timeoutID._idleStart
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
