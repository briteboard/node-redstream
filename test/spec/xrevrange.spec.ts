
import { deepStrictEqual as equal } from 'assert';
import { initSuite, seedStream } from '../test-utils.js';

const G1 = 'g1';

describe('xrevrange', async function () {
	const suite = initSuite(this);


	it('xrevrange-base', async () => {
		const stream = suite.stream;

		const ids = await seedStream(stream, 10);

		// check end / start ids
		let entries = await stream.xrevrange(ids[5], ids[3]);
		equal(entries.map(e => e.data.v), ['6', '5', '4'])

		// check id / - with count
		entries = await stream.xrevrange(ids[7], '-', 5);
		equal(entries.map(e => e.data.v), ['8', '7', '6', '5', '4']);

	});

});

