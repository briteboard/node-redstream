
import { deepStrictEqual as equal } from 'assert';
import readStream from '../../src';
import { initSuite, seedStream } from '../test-utils';

const G1 = 'g1';

describe('xinfo', async function () {
	const suite = initSuite(this);


	it('xinfo-stream', async () => {
		const stream = suite.stream;

		// check empty
		let info = await stream.xinfo();
		equal(info?.length, 0);
		equal(info?.firstEntry, null, 'firstEntry');

		// check with one entry
		await stream.xadd({ v: '1' });
		info = await stream.xinfo();
		equal(info?.length, 1);
		equal((info?.firstEntry != null), true, 'firstEntry');
	});

	it('xinfo-groups', async () => {
		const stream = suite.stream;

		// clean the groups
		await stream.xgroupDestroy('g1');
		await stream.xgroupDestroy('g2');

		// check no groups
		const emptyGroups = await stream.xinfoGroups();
		equal(emptyGroups.length, 0, 'emptyGroups.length');

		await stream.xgroupCreate('g1');
		await stream.xgroupCreate('g2');

		await stream.xadd([{ v: '1' }, { v: '2' }]);

		await stream.xreadgroup('g1', 'c1', { count: 1 });

		// check groups
		const groups = await stream.xinfoGroups();
		equal(groups.length, 2, 'groups.length');
		equal(groups[0].name, 'g1', 'groups[0].name');
		equal(groups[0].consumers, 1, 'groups[0].consumers');
		equal(groups[1].consumers, 0, 'groups[0].consumers');

	});

	it('xinfo-consumers', async () => {
		const stream = suite.stream;

		// make srue we have a fresh start
		await stream.xgroupDestroy('g1');
		await stream.xgroupDestroy('g2');
		await stream.xgroupCreate('g1');
		await stream.xgroupCreate('g2');

		// seed the stream
		await seedStream(stream, 10);

		// read the group, which create consumers
		await stream.xreadgroup('g1', 'c1', { count: 1 });
		await stream.xreadgroup('g1', 'c2', { count: 2 });

		// check g1 consumers
		const g1Consumers = await stream.xinfoConsumers('g1');
		equal(g1Consumers.length, 2, 'g1Consumers.length');
		equal(g1Consumers[0].name, 'c1', 'g1Consumers[0].name');
		equal(g1Consumers[0].pending, 1, 'g1Consumers[0].pending');
		equal(g1Consumers[1].pending, 2, 'g1Consumers[1].pending');

		// check g2 consumers, should be empty
		const g2Consuemrs = await stream.xinfoConsumers('g2');
		equal(g2Consuemrs.length, 0, 'g2Consuemrs.length');

		// check gNoExist consumers, should be empty
		const gNoExist = await stream.xinfoConsumers('gNoExist');
		equal(gNoExist.length, 0, 'gNoExist.length');
	});

	it('xinfo-stream-noexist', async () => {
		const stream = readStream(this.stream.ioRedis, 'noexist-stream');

		// check empty
		const info = await stream.xinfo();
		equal(info, null, 'info stream')

		// check xinfoGroups ([])
		const groups = await stream.xinfoGroups();
		equal(groups, [], 'xinfoGroups');

		const consumers = await stream.xinfoConsumers('no-exist-group');
		equal(consumers, [], 'xinfoConsumers');



	});


});


