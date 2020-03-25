
import { deepStrictEqual as equal } from 'assert';
import { initSuite } from '../test-utils';

const G1 = 'g1';

describe('xclaim', async function () {
	const suite = initSuite(this);


	it('xclaim-simple', async () => {
		const stream = suite.stream;
		// create a new group
		await stream.xgroupDestroy(G1);
		await stream.xgroupCreate(G1);

		await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });

		// check that it reads correctly
		const read1 = await stream.xreadgroup(G1, 'c1', { count: 1 });
		const pendingId1 = read1?.entries[0]?.id;

		// check that c1 has one pending
		let pending_c1 = await stream.xpending(G1, '-', '+', 100, 'c1');
		equal(pending_c1!.length, 1);

		// xclaim the pendingId1 for c2
		await stream.xclaim(G1, 'c2', 0, pendingId1!);

		// check that c1 pendings is 0
		pending_c1 = await stream.xpending(G1, '-', '+', 100, 'c1');
		equal(pending_c1!.length, 0);

		// check that c2 pending is 1
		const pending_c2 = await stream.xpending(G1, '-', '+', 100, 'c2');
		equal(pending_c2!.length, 1);

	});

});


