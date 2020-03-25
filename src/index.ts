import IORedis from 'ioredis';
import { DataParser, DefaultEntryData, RedStream } from './redstream';
import { RedStreamImpl } from './redstream-impl';
import { stringDataParser } from './utils';

export { RedStream } from './redstream';
export { stringDataParser };

//#region    ---------- Default ---------- 


interface StreamSpec<D> {
	key: string,
	dataParser: DataParser<D>
}

/** Factory to create a new RedStream instance from a  */
export default function redstream<D = DefaultEntryData>(ioRedis: IORedis.Redis, key_or_spec: string | StreamSpec<D>): RedStream<D> {

	const info = (typeof key_or_spec === 'string') ? { key: key_or_spec, dataParser: stringDataParser } : key_or_spec;

	return new RedStreamImpl(ioRedis, info.key, info.dataParser as DataParser<D>); // TS-NOTE Can cast dataParser becuse of how info is set with the default if only string

}
//#endregion ---------- /Default ----------
