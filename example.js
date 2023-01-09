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

		const c = new Webhook(null, {log: (message) => {

			//const parsed = JSON.parse(message);

			console.log(message);

		}}, 4, 10000, 5555);

		const output = await c.run('84a22349-0d92-4951-9a3a-7cf8ee12add5', {
			method: 'POST',
			url: 'http://127.0.0.1:7000/index.php',
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
