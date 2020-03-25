
import { deepStrictEqual as equal } from 'assert';
import { initSuite, seedStream } from '../test-utils';



describe('xread', async function () {
	const suite = initSuite(this);


	it('xread-simplest', async () => {
		const stream = suite.stream;
		await seedStream(stream);


		const result = await stream.xread();
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '1' }, { v: '2' }, { v: '3' }, { v: '4' }])
	});

	it('xread-count', async () => {
		const stream = suite.stream;
		await seedStream(stream);

		const result = await stream.xread({ count: 2 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '1' }, { v: '2' }])
	});

	it('xread-from', async () => {
		const stream = suite.stream;
		const ids = await seedStream(stream);

		const result = await stream.xread(ids[0]);
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '2' }, { v: '3' }, { v: '4' }])
	});

	it('xread-from-count', async () => {
		const stream = suite.stream;
		const ids = await seedStream(stream);

		const result = await stream.xread(ids[0], { count: 2 });
		const dataList = result!.entries.map(entry => entry.data);
		equal(dataList, [{ v: '2' }, { v: '3' }])
	});
});


