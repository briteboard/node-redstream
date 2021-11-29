
import { deepStrictEqual as equal, rejects } from 'assert';
import { initSuite } from '../test-utils';

const G1 = 'g1';



describe('xgroup', async function () {
	const suite = initSuite(this);


	it('xgroup-create', async () => {
		const stream = suite.stream;
		await stream.xgroupDestroy(G1);

		await stream.xadd({ v: '1' });


		await stream.xgroupCreate(G1);

		// fist empty one
		const result = await stream.xpending(G1);
		equal(result, { count: 0, smallest: null, highest: null, consumers: null });

		// xadd and xreadgroup
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });
		const rgResult = await stream.xreadgroup(G1, 'c1');

		equal(rgResult?.entries[0].data, { v: '1' });

		const result2 = await stream.xpending(G1);
		equal(result2.count, 3, 'count');
		equal(result2.smallest != null, true, 'result2.smallest != null');
		equal(result2.highest != null, true, 'result2.highest != null');
		equal(result2.consumers, [{ name: 'c1', count: 3 }]);

	});

	it('xgroup-create-$', async () => {
		const stream = suite.stream;
		await stream.xgroupDestroy(G1);

		await stream.xadd({ v: '1' });

		await stream.xgroupCreate(G1, { id: '$' });

		// fist empty one
		const result = await stream.xpending(G1);
		equal(result, { count: 0, smallest: null, highest: null, consumers: null });

		// xadd and xreadgroup
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });
		const rgResult = await stream.xreadgroup(G1, 'c1');
		equal(rgResult?.entries[0].data, { v: '2' });

		const pResult = await stream.xpending(G1);
		equal(pResult.count, 2, 'count');

		equal(pResult.smallest != null, true, 'result2.smallest != null');
		equal(pResult.highest != null, true, 'result2.highest != null');
		equal(pResult.consumers, [{ name: 'c1', count: 2 }]);

	});

	it('xgroup-destroy', async () => {
		const stream = suite.stream;

		await stream.xgroupCreate(G1);
		await stream.xgroupDestroy(G1);

		// Should throw exceptionts
		await rejects(stream.xpending(G1), (err: any) => err.message.includes('NOGROUP'));

	});

	it('xgroup-setid', async () => {
		const stream = suite.stream;

		// create a new group
		await stream.xgroupDestroy(G1);
		await stream.xgroupCreate(G1);

		await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });

		// check that it reads correctly
		const read1 = await stream.xreadgroup(G1, 'c1', { count: 1 });
		const read2 = await stream.xreadgroup(G1, 'c2', { count: 1 });
		equal(read2!.entries[0].data, { v: '2' });

		// set the group id back to '0'
		await stream.xgroupSetid(G1, '0');

		// read again, should be the first item now
		const read3 = await stream.xreadgroup(G1, 'c1', { count: 1 });
		equal(read3!.entries[0].data, { v: '1' });

	});

})
