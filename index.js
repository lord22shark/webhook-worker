/**
 * External Dependencies
 */ 
const {Worker, isMainThread, workerData} = require('worker_threads');
const path = require('path');

/**
 * Note for Default Logging Messages:
 * id, level, message, label, timestamp, payload
 */ 

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
	run (__id, __data) {

		return new Promise(function (resolve, reject) {

			this.resolver = resolve;

			this.rejecter = reject;

			if ((!__id) || (typeof(__id) !== 'string')) {

				reject(new Error('We need an identifier to start a Webhook Worker!'));

			} else {

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
							id: __id, 
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

						this.logger.log({
							id: __id,
							level: 'NOTICE',
							message: `Webhook Worker started for ${this.data.request.url} concerning ${__id}`,
							label: Webhook.LABEL,
							timestamp: new Date().toISOString(),
							payload: this.data
						});

					}

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

					// __message.data comes with the same pattern as event "finished" (ilmltp)

					this.logger.log(__message.data);

					if ((this.callback) && (this.callback instanceof Function)) {

						this.callback.call(this, __message.data);

					}

				break;

				case 'finished':

					const isSuccess = __message.data.success === true;

					this.logger.log({
						id: __message.data.id,
						level: (isSuccess) ? 'NOTICE' : 'ERROR',
						message: `Webhook Worker for ${this.data.request.url} concerning ${__message.data.id} is finished and received ${isSuccess ? 'SUCCESS' : 'ERROR'} message.`,
						label: Webhook.LABEL,
						timestamp: new Date().toISOString(),
						payload: __message.data
					});

					this.terminate();

					if (isSuccess === true) {

						this.resolver(__message.data);

					} else {

						this.rejecter(__message.data);

					}

				break;

			}

		} else {

			this.logger.log({
				id: null,
				level: 'ERROR',
				message: `Webhook Worker for ${this.data.request.url} received invalid message (payload)`,
				label: Webhook.LABEL,
				timestamp: new Date().toISOString(),
				payload: __message
			});

		}

	}

	/**
	 * 
	 */ 
	_onWorkerError (__error) {

		this.logger.log({
			id: null,
			level: 'ERROR',
			message: `Webhook Worker for ${this.data.request.url} raise an internal error (payload)`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString(),
			payload: __error
		});

		this.rejecter(__error);

	}

	/**
	 * 
	 */ 
	_onWorkerExit (__exitCode) {

		this.logger.log({
			id: null,
			level: 'NOTICE',
			message: `Webhook Worker for ${this.data.request.url} exited with code ${__exitCode}`,
			label: Webhook.LABEL,
			timestamp: new Date().toISOString(),
			payload: __exitCode
		});

	}

}

module.exports = Webhook;
