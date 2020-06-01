
import { deepStrictEqual as equal } from 'assert';
import redstream from '../../src';
import { stringDataParser } from '../../src/utils';
import { initSuite } from '../test-utils';


describe('data-parser', function () {
	const suite = initSuite(this);

	it('data-parser', async function () {

		const stream = redstream(suite.stream.ioRedis, { key: 's1', dataParser });

		await stream.xtrim(0);

		await stream.xadd({ v: 1 });
		await stream.xadd({ v: 2 });

		const result = await stream.xread();
		const vs: number[] = result?.entries.map(entry => entry.data.v) ?? [];
		equal(vs, [1, 2]);


	});


});

interface MyData {
	v: number;
}


function dataParser(arr: string[], id: string): MyData {
	let v: number;
	const nvObj = stringDataParser(arr, id);
	return { v: parseInt(nvObj.v) };
}