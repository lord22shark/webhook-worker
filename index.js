/**
 * External Dependencies
 */ 
const {Worker, isMainThread, workerData} = require('worker_threads');
const path = require('path');

/**
 * 
 */ 
class Webhook {

	static WORKER = 'worker.js';

	static TRIES = 10;

	static WAIT = 10000;

	static TIMEOUT = 10000;

	static LABEL = 'webhook-worker';

	/**
	 * 
	 */ 
	constructor (__logger, __tries, __wait, __timeout) {

		/*if ((!__callback) || (!(__callback instanceof Function))) {

			throw new Error('Cannot create a Webhook Worker without a callback function');

		} else {

			this.callback = __callback;

		}*/

		this.logger = (__logger && __logger.hasOwnProperty('log') && __logger.log instanceof Function) ? __logger : console;

		this.filename = path.resolve(__dirname, Webhook.WORKER);

		this.tries = __tries || Webhook.TRIES;

		this.wait = __wait || Webhook.WAIT;
		
		this.timeout = __timeout || Webhook.TIMEOUT;

		this.data = null;

		this.resolver = null;

		this.rejecter = null;

	}

	/**
	 * 
	 */ 
	run (__data) {

		return new Promise(function (resolve, reject) {

			this.resolver = resolve;

			this.rejecter = reject;

			if ((!__data) || (!(__data instanceof Object))) {

				reject(new Error('We need data to start a Webhook Worker!'));

			} else {

				const allset = ['url', 'method', 'data'].reduce((previous, current) => {

					return previous && !!__data[current];

				}, true);

				if (!allset) {

					reject(new Error('To init a Webhook Worker we data an object with axios request properties... at least URL, METHOD and DATA!'));

				} else {

					this.data = {
						tries: this.tries,
						wait: this.wait,
						status: [],
						response: [],
						request: __data,
						success: false
					};

					if (!__data.hasOwnProperty('timeout')) {

						__data.timeout = this.timeout;

					}

					this.worker = new Worker(this.filename, {
						workerData: this.data
					});

					this.worker.once('message', this.onWorkerMessage.bind(this));

					this.worker.on('error', this.onWorkerError.bind(this));

					this.worker.on('exit', this.onWorkerExit.bind(this));

					this.logger.log(JSON.stringify({
						level: 'info',
						message: `Webhook Worker started for ${this.data.request.url}`,
						label: Webhook.LABEL,
						timestamp: new Date().toISOString()
					}));

				}

			}

		}.bind(this));


	}

	/**
	 * 
	 */ 
	onWorkerMessage (__message) {

		this.logger.log(JSON.stringify({
			level: 'error',
			message: `Webhook Worker for ${this.data.request.url} received message: ${__message.success === true ? 'SUCCESS!' : 'ERROR!'}`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString()
		}));

		if (__message.success === true) {

			this.resolver(__message);

		} else {

			this.rejecter(__message);

		}

	}

	/**
	 * 
	 */ 
	onWorkerError (__error) {

		this.logger.log(JSON.stringify({
			level: 'error',
			message: `Webhook Worker for ${this.data.request.url} raise an error: ${__error.toString()}`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString()
		}));

		this.rejecter(__error);

	}

	/**
	 * 
	 */ 
	onWorkerExit (__exitCode) {

		this.logger.log(JSON.stringify({
			level: 'info',
			message: `Webhook Worker for ${this.data.request.url} exited with ${__exitCode} code`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString()
		}));

	}

}

module.exports = Webhook;
