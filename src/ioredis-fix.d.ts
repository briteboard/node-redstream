import 'ioredis';
import { StreamReadRaw } from './ioredis-type-helpers';


/////////////////////
// This module fix some issues in @types/ioredis type (return of xread and xgroup) and augment args for xadd
// to allow dynamic argument passing.
// Note: Eventually we will do a pull request to @types/ioredis
////



declare module "ioredis" {

	interface Redis {

		//// Fixes:

		/* xread return type fix from @types/ioredis */
		xread(...args: ValueType[]): StreamReadRaw | null;
		/* xgroup return xifx from @types/ioredis */
		xgroup(...args: ValueType[]): Promise<Ok | number>; // create return OK, but destroy number


		//// Agumentation for dynamic argument passing:

		/* xadd augment to allow more dynamic argument passing */
		xadd(...args: ValueType[]): Promise<string>
	}

	interface Pipeline {
		xadd(...args: ValueType[]): Promise<string>
	}
}




