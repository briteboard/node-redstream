import { deepStrictEqual as equal } from 'assert';
import IORedis from 'ioredis';
import redstream, { RedStream } from '../src';

declare global {
	namespace Mocha {
		interface Suite {
			stream: RedStream
		}
	}
}


export function initSuite(suite: Mocha.Suite) {
	suite.beforeAll(() => {
		suite.stream = redstream(newIORedis(), 's1');
	});

	suite.afterAll(async function () {
		// runs once after the last test in this block
		await suite.stream.ioRedis.disconnect();
	});

	suite.beforeEach(async () => {
		const stream = suite.stream;

		// trim the stream
		await stream.xtrim(0, true);

		// remove all groups
		const groups = await stream.xinfoGroups();
		for (const group of groups) {
			await stream.xgroupDestroy(group.name);
		}
	});

	return suite;
}


//#region    ---------- Utils ---------- 

export function newIORedis() {
	return new IORedis();
}

export async function seedStream(stream: RedStream, count = 4): Promise<string[]> {

	// check if 0
	let l = await stream.xlen();
	equal(l, 0);

	// add the items
	const dataList: any[] = [];
	for (let i = 0; i < count; i++) {
		dataList.push({ v: '' + (i + 1) });
	}

	const ids = await stream.xadd(dataList);

	// check that all is added
	l = await stream.xlen();
	equal(l, count);
	equal(ids.length, count);

	return ids;
}

export async function wait(ms: number) {
	return new Promise<void>((res, rej) => {
		setTimeout(() => { res() }, ms)
	})
}

//#endregion ---------- /Utils ---------- 