
import { deepStrictEqual as equal } from 'assert';
import { initSuite, seedStream } from '../test-utils.js';

const G1 = 'g1';

describe('xrange', async function () {
	const suite = initSuite(this);


	it('xrange-base', async () => {
		const stream = suite.stream;

		const ids = await seedStream(stream, 10);

		// check start / end ids
		let entries = await stream.xrange(ids[3], ids[5]);
		equal(entries.map(e => e.data.v), ['4', '5', '6'])

		// check start / + with count
		entries = await stream.xrange(ids[3], '+', 5);
		equal(entries.map(e => e.data.v), ['4', '5', '6', '7', '8']);

	});

});

