import { deepStrictEqual as equal } from 'assert';
import { camelDataParser } from '../../src/utils.js';

const G1 = 'g1';

describe('utils', async function () {


	it('utils-camel', async () => {

		equal(camelDataParser(['msg', 'hello']), { msg: 'hello' });
		equal(camelDataParser(['msg', 'hello', 'short-val', '1']), { msg: 'hello', shortVal: '1' });
		equal(camelDataParser(['msg', 'hello', 'deep-name-val', '2']), { msg: 'hello', deepNameVal: '2' });
		equal(camelDataParser(['msg', 'hello', 'deep-name-val', '2'], { asNumber: ['deepNameVal'] }), { msg: 'hello', deepNameVal: 2 });
	});

});