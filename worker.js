/**
 * External Dependencies
 */ 
const axios = require('axios');
const {parentPort, workerData} = require('worker_threads');

/**
 * 
 */ 
async function webhookRequester (__data) {

	if (__data.tries === 0) {

		parentPort.postMessage(__data);

		process.exit(1);

	} else {

		const wait = (__data.response.length === 0) ? 0 : __data.wait;

		setTimeout(async () => {

			console.log(JSON.stringify({
				level: 'debug',
				message: `Webhook Worker for ${__data.request.url} is about to request ${__data.tries} try...`,
				label: 'webhook-worker',
				timestamp: new Date().toISOString()
			}));

			try {

				const response = await axios(__data.request);

				__data.response.push(response.data);

				__data.status.push(response.status);

				if (response.status.toString().startsWith('2')) {

					__data.success = true;

					parentPort.postMessage(__data);
					
					process.exit(0);

				}

			} catch (httpError) {

				const responseError = httpError.response;

				__data.status.push((responseError) ? responseError.status : 500);
				
				__data.response.push((responseError) ? responseError.data : httpError);

				__data.tries -= 1;

				await webhookRequester(__data);

			}

		}, wait);

	}

};

(async () => {

	await webhookRequester(workerData);

})();
