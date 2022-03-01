/**
 * 0) Import Webhook after configure in package.json -> "webhook-worker": "git://github.com/lord22shark/webhook-worker.git#main"
 */ 
//const Webhook = require('webhook-worker');
const Webhook = require('./index.js');

/**
 * 1) 
 */ 
(async () => {

	try {

		const c = new Webhook((message) => {

			console.log('Message: ', JSON.stringify(message));

		}, console, 4, null, 5555);

		const output = await c.run({
			method: 'POST',
			url: 'http://localhost:6666/a',
			data: JSON.stringify({
				a: 1,
				b: true,
				c: null,
				d: 'asdasda'
			}),
			headers: {
				'Content-type': 'application/json'
			}
		});

		console.log('AFTER FINISHED ALL TRIES: ', output);

	} catch (whError) {

		console.log('EXCEPTION OCCURRED: ', whError);

	}

})();
