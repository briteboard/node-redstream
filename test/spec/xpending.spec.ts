
import { deepStrictEqual as equal } from 'assert';
import { initSuite } from '../test-utils.js';


describe('xpending', async function () {
	const suite = initSuite(this);


	it('xpending-summary', async () => {
		const stream = suite.stream;
		const G1 = 'g1';

		await stream.xgroupDestroy(G1);
		await stream.xgroupCreate(G1);

		// fist empty one
		const result = await stream.xpending(G1);
		equal(result, { count: 0, smallest: null, highest: null, consumers: null });

		// xadd and xreadgroup
		await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });
		await stream.xreadgroup(G1, 'c1');

		const result2 = await stream.xpending(G1);
		equal(result2.count, 2, 'count');
		equal(result2.smallest != null, true, 'result2.smallest != null');
		equal(result2.highest != null, true, 'result2.highest != null');
		equal(result2.consumers, [{ name: 'c1', count: 2 }]);

	});


	it('xpending-details', async () => {
		const stream = suite.stream;
		const G1 = 'g1';

		await stream.xgroupDestroy(G1);
		await stream.xgroupCreate(G1);

		// xadd and xreadgroup
		await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });
		await stream.xreadgroup(G1, 'c1', { count: 2 });
		await stream.xreadgroup(G1, 'c2', { count: 2 });

		const resultAll = await stream.xpending(G1, '-', '+', 10);
		equal(resultAll?.length, 3);
		const resultC1 = await stream.xpending(G1, '-', '+', 10, 'c1');
		equal(resultC1?.length, 2);
		const resultC2 = await stream.xpending(G1, '-', '+', 10, 'c2');
		equal(resultC2?.length, 1);
	});

});