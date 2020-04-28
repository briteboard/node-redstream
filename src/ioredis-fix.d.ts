import 'ioredis';
import { StreamReadRaw } from './ioredis-type-helpers';


/////////////////////
// This module fix some issues in @types/ioredis type (return of xread and xgroup) and augment args for xadd
// to allow dynamic argument passing.
// Note: Eventually we will do a pull request to @types/ioredis
////



declare module "ioredis" {

	interface Redis {

		//// Fixes: (see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/44301)

		/* @types/ioredis - somehow @types/ioredis returns Array<[string, string[]]> */
		xread(...args: ValueType[]): StreamReadRaw | null;

		/* @types/ioredis - somehow @types/ioredis returns Array<[string, string[]]> */
		// Note: does not return null because throw exception if stream/group not present or auto create
		xreadgroup(...args: ValueType[]): StreamReadRaw;

		/* xgroup return fix from @types/ioredis */
		xgroup(...args: ValueType[]): Promise<Ok | number>; // create return OK, but destroy number


		//// Agumentation for dynamic argument passing:

		/* xadd augment to allow more dynamic argument passing */
		xadd(...args: ValueType[]): Promise<string>
	}

	interface Pipeline {
		xadd(...args: ValueType[]): Promise<string>
	}
}




