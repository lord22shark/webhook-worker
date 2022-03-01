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

	static TIMEOUT = 10000;

	static LABEL = 'webhook-worker';

	/**
	 * Callback is for intermediary events. Promise with be return when finished
	 */ 
	constructor (__callback, __logger, __tries, __wait, __timeout) {

		if ((__callback) && (!(__callback instanceof Function))) {

			throw new Error('If you want a callback, it should be a function');

		} else {

			this.callback = __callback || null;

		}

		this.logger = (__logger && __logger.hasOwnProperty('log') && __logger.log instanceof Function) ? __logger : console;

		this.filename = path.resolve(__dirname, Webhook.WORKER);

		this.tries = __tries || Webhook.TRIES;

		this.timeout = __timeout || Webhook.TIMEOUT;
		
		this.wait = __wait || null;

		this.data = null;

		this.resolver = null;

		this.rejecter = null;

		this.worker = null;

	}

	/**
	 * Returns a Promise
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
						total: this.tries,
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

					this.worker.on('message', this._onWorkerMessage.bind(this));

					this.worker.on('error', this._onWorkerError.bind(this));

					this.worker.on('exit', this._onWorkerExit.bind(this));

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
	terminate () {

		this.worker.terminate();

	}

	/**
	 * 
	 */ 
	interrupt (__id) {

		if ((!__id) || (typeof(__id) !== 'number')) {

			throw new Error('clearTimeout requires an integer ID');

		}

		this.worker.postMessage({
			event: 'clearTimeout',
			data: __id
		});

	}

	/**
	 * 
	 */ 
	_onWorkerMessage (__message) {

		const eType = __message.event;

		if (eType) {

			switch (eType) {

				case 'logger':

					this.logger.log(JSON.stringify(__message.data));

					if ((this.callback) && (this.callback instanceof Function)) {

						this.callback.call(this, __message.data);

					}

				break;

				case 'finished':

					this.logger.log(JSON.stringify({
						level: 'error',
						message: `Webhook Worker for ${this.data.request.url} received message: ${__message.data.success === true ? 'SUCCESS!' : 'ERROR!'}`,
						label: Webhook.LABEL,
						timestamp: new Date().toISOString()
					}));

					this.terminate();

					if (__message.success === true) {

						this.resolver(__message.data);

					} else {

						this.rejecter(__message.data);

					}

				break;

			}

		} else {

			this.logger.log(JSON.stringify({
				level: 'error',
				message: `Webhook Worker for ${this.data.request.url} received invalid message: ${JSON.stringify(__message)}`,
				label: Webhook.LABEL,
				timestamp: new Date().toISOString()
			}));

		}

	}

	/**
	 * 
	 */ 
	_onWorkerError (__error) {

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
	_onWorkerExit (__exitCode) {

		this.logger.log(JSON.stringify({
			level: 'info',
			message: `Webhook Worker for ${this.data.request.url} exited with code ${__exitCode}`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString()
		}));

	}

}

module.exports = Webhook;
