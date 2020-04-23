
import { deepStrictEqual as equal } from 'assert';
import redstream from '../../src';
import { objectDataParser } from '../../src/utils';
import { initSuite, seedStream } from '../test-utils';

describe('xadd', function () {

	const suite = initSuite(this);

	it('xadd-simple', async () => {
		const stream = suite.stream;
		let l = await stream.xlen();
		equal(l, 0);
		const id1 = await stream.xadd({ v: '1' });
		await stream.xadd({ v: '2' });
		await stream.xadd({ v: '3' });
		await stream.xadd({ v: '4' });
		l = await stream.xlen();
		equal(l, 4);

		const result = await stream.xread(id1, { count: 2 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '2' }, { v: '3' }]);
	});


	it('xadd-nested-object', async () => {
		const stream = redstream(suite.stream.ioRedis, {
			key: 's1', dataParser: (arr: string[]) => {
				const data = objectDataParser(arr);
				const v = Number(data.v);
				return { v, sub: data.sub };
			}
		});

		let l = await stream.xlen();
		equal(l, 0);
		const id1 = await stream.xadd({ v: 1, sub: { some: 'value1' } });

		const result = await stream.xread('0', { count: 2 });
		equal(result?.entries[0].data.sub.some, 'value1');
	});

	it('xadd-nested-array', async () => {
		const stream = redstream(suite.stream.ioRedis, {
			key: 's1', dataParser: (arr: string[]) => {
				const data = objectDataParser(arr);
				const v = Number(data.v);
				return { v, nums: data.nums as number[] };
			}
		});

		let l = await stream.xlen();
		equal(l, 0);
		const id1 = await stream.xadd({ v: 1, nums: [1, 2, 3] });

		const result = await stream.xread('0', { count: 2 });
		equal(result?.entries[0].data.nums[2], 3);
	});

	it('xadd-maxlen-exact', async () => {
		const stream = suite.stream;
		let l = await stream.xlen();
		equal(l, 0);

		const ids = await seedStream(stream, 4);
		await stream.xadd({ v: '5' }, { maxlen: 3, maxlenExact: true });

		l = await stream.xlen();
		equal(l, 3);

		const result = await stream.xread(ids[0], { count: 3 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '3' }, { v: '4' }, { v: '5' }])
	});

	it('xadd-maxlen-about', async () => {
		const stream = suite.stream;
		let l = await stream.xlen();
		equal(l, 0);

		await seedStream(stream, 1000);
		await stream.xadd({ v: '99999' }, { maxlen: 5 });

		l = await stream.xlen();
		equal((l > 5), true, 'xlen >= 5');


	});

	it('xadd-multiple', async () => {
		const stream = suite.stream;
		let l = await stream.xlen();
		equal(l, 0);

		const list = [{ v: '1' }, { v: '2' }, { v: '3' }, { v: '4' }]
		const ids = await stream.xadd(list);
		l = await stream.xlen();
		equal(l, 4);

		const result = await stream.xread(ids[0], { count: 2 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '2' }, { v: '3' }]);
	});

});

