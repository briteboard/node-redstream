
import { deepStrictEqual as equal } from 'assert';
import redstream from '../../src';
import { initSuite, newIORedis, seedStream, wait } from '../test-utils';



describe('xreadgroup', async function () {
	const suite = initSuite(this);


	it('xreadgroup-simplest', async () => {
		const stream = suite.stream;

		await stream.xgroupCreate('g1');
		await seedStream(stream);

		const result = await stream.xreadgroup('g1', 'c1');
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '1' }, { v: '2' }, { v: '3' }, { v: '4' }])
	});



	it('xreadgroup-count', async () => {
		const stream = suite.stream;

		await stream.xgroupCreate('g1');
		await seedStream(stream);

		const result = await stream.xreadgroup('g1', 'c1', { count: 2 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '1' }, { v: '2' }])
	});

	it('xreadgroup-count-and-pending', async () => {
		const stream = suite.stream;

		await stream.xgroupCreate('g1');
		const ids = await seedStream(stream);

		// first three
		let result = await stream.xreadgroup('g1', 'c1', '>', { count: 3 });
		let dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '1' }, { v: '2' }, { v: '3' }]);

		// get pending
		result = await stream.xreadgroup('g1', 'c1', ids[0]);
		dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '2' }, { v: '3' }]);

	});

	//// NOTE for now disable this test, the xreadgroup block cause the test to hang
	it('xreadgroup-block', async function () {
		const stream = suite.stream;

		// make sure the stream is clean of group
		await stream.xgroupDestroy('g1');
		await stream.xgroupCreate('g1');

		// Send another stream entry
		// Note: Must have other stream (ioredis client, otherwise, the command above block)
		const stream_clone = redstream(newIORedis(), stream.key);
		await stream_clone.xadd({ v: '5' });
		await stream_clone.xadd({ v: '6' });

		// first start the block command (do not await to do the rest below)
		let resultP = stream.xreadgroup('g1', 'c1', { block: true });
		await wait(10);

		await wait(10);

		const result = await resultP;
		let dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '5' }, { v: '6' }]);
		await stream_clone.ioRedis.disconnect();
	});

	it('xreadgroup-block-1', async function () {
		const stream = suite.stream;

		// make sure the stream is clean of group
		await stream.xgroupDestroy('g1');
		await stream.xgroupCreate('g1');

		// Send another stream entry
		// Note: Must have other stream (ioredis client, otherwise, the command above block)
		const stream_clone = redstream(newIORedis(), stream.key);
		await stream_clone.xadd({ v: '5' });
		await stream_clone.xadd({ v: '6' });

		// first start the block command (do not await to do the rest below)
		let resultP = stream.xreadgroup('g1', 'c1', { block: true, count: 1 });
		await wait(10);



		await wait(10);

		const result = await resultP;
		let dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '5' }]);
		await stream_clone.ioRedis.disconnect();
	});


	it('xreadgroup-mkgroup', async function () {
		const stream = suite.stream;

		// make sure the stream is clean of group
		await stream.xgroupDestroy('g1');

		await seedStream(stream, 4);

		const rgResult = await stream.xreadgroup('g1', 'c1');
		equal(rgResult?.entries.length, 4);
		equal(rgResult?.entries[0].data?.v, '1');

	});

	it('xreadgroup-mkgroup-$', async function () {
		const stream = suite.stream;
		await stream.xadd({ v: '0' });

		// make sure the stream is clean of group
		await stream.xgroupDestroy('g1');

		const rgResult = await stream.xreadgroup('g1', 'c1', { mkgroup: '$' });
		equal(rgResult, null); // should be null at this point, because '$' above


		await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });

		const rgResult2 = await stream.xreadgroup('g1', 'c1');
		equal(rgResult2?.entries.length, 2);
		equal(rgResult2?.entries[0].data?.v, '1');

	});

});
