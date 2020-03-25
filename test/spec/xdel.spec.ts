
import { deepStrictEqual as equal } from 'assert';
import { initSuite } from '../test-utils';

const G1 = 'g1';

describe('xdel', async function () {
	const suite = initSuite(this);


	it('xdel-base', async () => {
		const stream = suite.stream;

		const ids: string[] = [];
		for (let i = 1; i < 11; i++) {
			const id = await stream.xadd({ v: '' + i });
			ids.push(id);
		}

		// check start length
		let len = await stream.xlen();
		equal(len, 10);

		// delete one and check length
		let delResult = await stream.xdel(ids[0]);
		equal(delResult, 1);
		len = await stream.xlen();
		equal(len, 9);

		// delete couple more and check length
		delResult = await stream.xdel(ids[1], ids[2]);
		equal(delResult, 2);
		len = await stream.xlen();
		equal(len, 7);

		// delete some already deleted, should be no-op
		delResult = await stream.xdel(ids[0], ids[2]);
		equal(delResult, 0);
		len = await stream.xlen();
		equal(len, 7);
	});

});


