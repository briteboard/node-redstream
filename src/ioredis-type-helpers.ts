// import IORedis, { Ok, Pipeline, ValueType } from 'ioredis';


export type StreamName = string;
export type EntryId = string;
export type EntryRaw = [EntryId, string[]];
export type StreamReadRaw = [StreamName, EntryRaw[]][]; // [string, [string, string[]][]][]

// interface PipelineFixedType extends Omit<Pipeline, 'xadd'> {
// 	xadd(key: string, ...args: ValueType[]): Promise<string>
// }

// /**
//  * @type/ioredis type return wrong types for xread, xreadgroup (see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/44301),
//  * and xgroup, and has limiting flexibility on xadd (preventing dynamic building for args). 
//  * 
//  * Unfortunately, type agumentation to bring those fixes cannot be done, so, we have to use this type overwrite technic.
//  */
// export interface IORedisFixedType extends Omit<IORedis.Redis, 'xread' | 'xreadgroup' | 'xgroup' | 'xadd' | 'pipeline'> {
// 	xread: (...args: ValueType[]) => Promise<StreamReadRaw | null>;
// 	xreadgroup(...args: ValueType[]): Promise<StreamReadRaw>;
// 	xgroup(...args: ValueType[]): Promise<Ok | number>;
// 	xadd(key: string, ...args: ValueType[]): Promise<string>

// 	pipeline(): PipelineFixedType
// }
