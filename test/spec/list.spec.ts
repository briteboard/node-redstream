import { deepStrictEqual as equal } from 'assert';
import { initSuite, seedStream } from '../test-utils';

const G1 = 'g1';

describe('list', async function () {
	const suite = initSuite(this);


	it('list-base', async () => {
		const stream = suite.stream;

		const ids = await seedStream(stream, 100);

		// perform list
		let r = await stream.list('desc');
		let dataList = r.entries.map(e => e.data);

		// first item should be the last
		equal(dataList[0].v, '100');

		// first item should be the last
		equal(dataList[dataList.length - 1].v, '1');

	});

	it('list-big', async function () {
		const stream = suite.stream;

		const ids = await seedStream(stream, 2000);

		// perform list
		let r = await stream.list('desc');
		let dataList = r.entries.map(e => e.data);

		// first item should be the last (because default limit is 1000)
		equal(dataList[0].v, '2000');

		// first item should be the last
		equal(dataList[dataList.length - 1].v, '1001');

	});

	it('list-match', async function () {
		const stream = suite.stream;

		const ids = await seedStream(stream, 2000);

		// perform list
		let r = await stream.list('desc', {
			match: (d) => {
				return (d.v === '999' || d.v === '88');
			}
		});
		let dataList = r.entries.map(e => e.data);

		// first item should be the last
		equal(dataList[0].v, '999');

		// first item should be the last
		equal(dataList[dataList.length - 1].v, '88');

	});

	it('list-batch', async function () {
		const stream = suite.stream;

		const ids = await seedStream(stream, 2000);
		const match = (d: any) => {
			return (d.v === '100' || d.v === '800' || d.v === '1800' || d.v === '1900');
		}

		// perform list
		let r = await stream.list('desc', {
			max: 1300, // only fetch 1300 max
			match
		});
		let dataList = r.entries.map(e => e.data);

		// NOTE: we should not get the v: '100' as it is out of scope from max 1300
		equal([{ v: '1900' }, { v: '1800' }, { v: '800' }], dataList);

		// second perform list
		r = await stream.list('desc', {
			max: 1901,
			match
		});
		dataList = r.entries.map(e => e.data);

		// NOTE: Now, we get the v: '100' as the max is 1901
		equal([{ v: '1900' }, { v: '1800' }, { v: '800' }, { v: '100' }], dataList);

	});

	it('list-limit', async function () {
		const stream = suite.stream;

		const ids = await seedStream(stream, 1100);

		// perform list
		let r = await stream.list('desc', {
			batch: 50,
			limit: 221
		});

		equal(r.entries.length, 221);
		equal(r.fetched, 250);
	});

});


