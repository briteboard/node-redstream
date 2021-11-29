
import { deepStrictEqual as equal } from 'assert';
import { initSuite, seedStream } from '../test-utils.js';

describe('xtrim', function () {

	const suite = initSuite(this);

	it('xtream-simple', async () => {

		const stream = suite.stream;

		await seedStream(stream, 1000);
		// trim to a list of 80
		const num = await stream.xtrim(80);
		const l = await stream.xlen();
		equal((l > 80), true, 'l > 80')
	});

	it('xtream-exact', async () => {

		const stream = suite.stream;

		await seedStream(stream, 1000);
		// trim to a list of 80
		const num = await stream.xtrim(80, true);
		const l = await stream.xlen();
		equal(l, 80, 'l === 80')
	});


});
