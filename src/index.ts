import IORedis from 'ioredis';
import { DataParser, DataSerializer, DefaultEntryData, RedStream } from './redstream';
import { RedStreamImpl } from './redstream-impl';
import { objectDataParser, objectDataSerializer, stringDataParser, stringDataSerializer } from './utils';

export { RedStream } from './redstream';
export { DataParser, DataSerializer, stringDataParser, stringDataSerializer, objectDataParser, objectDataSerializer };

//#region    ---------- Default ---------- 


interface StreamSpec<D> {
	key: string,
	dataParser: DataParser<D>
	dataSerializer?: DataSerializer<D>
}

/** Factory to create a new RedStream instance from a  */
export default function redstream<D = DefaultEntryData>(ioRedis: IORedis.Redis, key_or_spec: string | StreamSpec<D>): RedStream<D> {

	const spec: StreamSpec<D> = (typeof key_or_spec === 'string') ? { key: key_or_spec, dataParser: objectDataParser } as StreamSpec<D> : key_or_spec;

	const dataParser = spec.dataParser;
	const dataSerializer = spec.dataSerializer ?? objectDataSerializer as DataSerializer<D>;

	return new RedStreamImpl(ioRedis, spec.key, dataParser, dataSerializer); // TS-NOTE Can cast dataParser becuse of how info is set with the default if only string

}
//#endregion ---------- /Default ----------
