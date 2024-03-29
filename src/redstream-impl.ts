import { Redis } from 'ioredis';
import { EntryRaw, StreamReadRaw } from './ioredis-type-helpers.js';
// import { EntryRaw, IORedisFixedType, StreamReadRaw } from './ioredis-type-helpers.js';
import { DataParser, DataSerializer, DefaultEntryData, DEFAULT_LIST_OPTIONS, ListDirection, ListOptions, ListResult, RedStream, StreamEntry, StreamGroupEntry, XAddOptions, XAddsOptions, XClaimOptions, XClaimResult, XInfoConsumers, XInfoGroup, XInfoStreamRawObj, XInfoStreamResult, XPendingDetailsResult, XPendingSummaryResult, XReadGroupOptions, XReadGroupResult, XReadOptions, XReadResult } from './redstream.js';
import { camelDataParser, objectDataSerializer } from './utils.js';

/////////////////////
// Module encapsulating the RedStream implementation. NOT to be called directly, default module redstream() factory.
////



const DEFAULT_XGROUPCREATE_ID = '0';

export class RedStreamImpl<D = DefaultEntryData> implements RedStream<D> {
	#ioRedis: Redis;

	readonly key: string;


	get ioRedis() { return this.#ioRedis };

	private readonly _dataParser: DataParser<D>;
	get dataParser() { return this._dataParser };

	private readonly _dataSerializer: DataSerializer<D>;
	get dataSerializer() { return this._dataSerializer };


	constructor(ioRedis: Redis, name: string, parser: DataParser<D>, serializer: (data: D) => string[]) {
		this.key = name;
		this.#ioRedis = ioRedis;
		this._dataParser = parser;
		this._dataSerializer = serializer ?? objectDataSerializer;
	}

	async xtrim(count: number, exact = false): Promise<number> {
		const args = (exact) ? ['' + count] : ['~', '' + count];
		if (exact) {
			return this.#ioRedis.xtrim(this.key, 'MAXLEN', count);
		} else {
			return this.#ioRedis.xtrim(this.key, 'MAXLEN', '~', count);
		}

	}

	async xlen(): Promise<number> {
		return await this.#ioRedis.xlen(this.key);
	}


	xadd(obj: D, maxlen?: number): Promise<string>;
	xadd(obj: D, opts?: XAddOptions): Promise<string>;
	xadd(obj: D[], maxlen?: number): Promise<string[]>;
	xadd(objs: D[], opts?: XAddsOptions): Promise<string[]>;
	async xadd(obj: D | D[], opts_or_maxlen?: XAddOptions | number): Promise<string | string[] | null> {

		let maxlen: number | undefined;
		let maxlenExact = false; // default false
		let id = '*';
		if (opts_or_maxlen != null) {
			if (typeof opts_or_maxlen === 'number') {
				maxlen = opts_or_maxlen;
			} else {
				maxlen = opts_or_maxlen.maxlen;
				maxlenExact = opts_or_maxlen.maxlenExact ?? maxlenExact; // if not defined, take the default set above
				id = opts_or_maxlen?.id ?? '*';
			}

		}

		const args: any[] = [];

		// set maxlen
		// NOTE: By Default it is approximate (except if maxlenExact = true)
		if (maxlen != null) {
			if (maxlenExact === true) {
				args.push('MAXLEN', maxlen);
			} else {
				args.push('MAXLEN', '~', maxlen);
			}
		}

		if (obj instanceof Array) {
			args.push('*'); // Here when list of objects, always use '*', the opts should not have .id
			const batch = this.#ioRedis.pipeline();
			for (const itemObj of obj) {
				const arr = this._dataSerializer(itemObj);
				//const id = await this.ioRedis.xadd(this.key, ...[...args, ...arr]);
				//result.push(id);
				batch.xadd(this.key, ...[...args, ...arr]);
			}
			const execResult = await batch.exec(); // [error, id][]
			return execResult?.map(item => item[1]) as string[];
		} else {
			const arr = this._dataSerializer(obj);
			args.push(id);
			return this.#ioRedis.xadd(this.key, ...[...args, ...arr]);
		}


	}

	async xread(id_or_opts?: string | XReadOptions, opts?: XReadOptions): Promise<XReadResult<D> | null> {
		const id_or_opts_isString = (typeof id_or_opts === 'string');
		const id = id_or_opts_isString ? id_or_opts as string : null;
		opts = id_or_opts_isString ? opts : id_or_opts as XReadOptions; // help ts here

		let args: string[] = [];

		const block = opts?.block ?? false;
		// if no id was specificied, and we have a block, then, '$' otherwise, default to 0
		const qid = id ?? ((block !== false) ? '$' : '0');
		pushXReadOpts(args, this.key, qid, opts);

		//// Exec
		// e.g., await ioRedis.xread(split`BLOCK 0 COUNT 2 STREAMS ${S1} ${fromId}`);
		// TODO - FIX TYPE
		const rawResult = await this.#ioRedis.xread(args as any);
		return (rawResult != null) ? (parseReadResult(rawResult, qid, this._dataParser)[0] ?? null) : null;
	}


	/**
	 * Will execute something like `XREADGROUP GROUP g1 c1 STREAMS s1 >`
	 */
	async xreadgroup(group: string, consumer: string, id_or_opts?: string | XReadGroupOptions, opts?: XReadGroupOptions): Promise<XReadGroupResult<D> | null> {
		const id_or_opts_isString = (typeof id_or_opts === 'string');
		const id = id_or_opts_isString ? id_or_opts as string : null;
		opts = id_or_opts_isString ? opts : id_or_opts as XReadGroupOptions; // help ts here


		const args: string[] = [];

		// if no id was specificied, and we have a block, then, '$' otherwise, default to 0
		const qid = id ?? '>';

		pushXReadOpts(args, this.key, qid, opts);

		//// Exec
		// e.g., await client.xreadgroup('GROUP', G1, 'c1', split`STREAMS ${S1} >`);
		let rawResult: StreamReadRaw | null;
		try {
			// TODO - FIX TYPE
			rawResult = (await this.#ioRedis.xreadgroup('GROUP', group, consumer, args as any)) as (StreamReadRaw | null);
		} catch (ex: any) {
			const mkgroup = opts?.mkgroup ?? true; // by default we create the group
			const mkgroupId = (typeof mkgroup === 'string') ? mkgroup : DEFAULT_XGROUPCREATE_ID;
			if (mkgroup && ex?.message?.includes('NOGROUP')) {
				await this.xgroupCreate(group, { id: mkgroupId }); // create the group (won't through an exception, but group might already exist)
				// if fail this time, pass it through
				// TODO - FIX TYPE
				rawResult = (await this.#ioRedis.xreadgroup('GROUP', group, consumer, args as any)) as StreamReadRaw | null;
			} else {
				throw ex;
			}

		}

		return (rawResult != null) ? (parseReadGroupResult(rawResult, qid, this._dataParser, group, consumer)[0] ?? null) : null;
	}

	async xrange(start: string, end: string, count?: number): Promise<StreamEntry<D>[]> {
		const args = [start, end] as [string, string];
		if (count != null) {
			args.push('COUNT', '' + count);
		}

		// TS-NOTE here the args might be 4 strings, compatible with js call
		const rawXRangeResult = await this.#ioRedis.xrange(this.key, ...args);

		return rawXRangeResult.map(rawEntry => parseEntry(rawEntry, this._dataParser, true));

	}

	async xrevrange(end: string, start: string, count?: number): Promise<StreamEntry<D>[]> {
		const args = [end, start] as [string, string];
		if (count != null) {
			args.push('COUNT', '' + count);
		}

		const rawXRangeResult = await this.#ioRedis.xrevrange(this.key, ...args); // TS-NOTE here the args might be 4 strings, compatible with js call

		return rawXRangeResult.map(rawEntry => parseEntry(rawEntry, this._dataParser, true));

	}

	async xdel(...ids: string[]): Promise<number> {
		return this.#ioRedis.xdel(this.key, ...ids);
	}

	/** Create a group for a given stream. By default does a MKSTREAM, can be turned off. */
	async xgroupCreate(group: string, opts?: { id?: string, mkstream?: false }): Promise<true | Error> {
		// XGROUP CREATE s1 g1 $ MKSTREAM
		const args = ['CREATE', this.key, group, opts?.id ?? DEFAULT_XGROUPCREATE_ID];
		if (opts?.mkstream !== false) {
			args.push('MKSTREAM'); // by default, do the MKSTREAM (create stream if no exist)
		}
		try {
			// TODO - FIX TYPE
			await this.#ioRedis.xgroup(args as any);
			return true;
		} catch (ex) {
			if (ex instanceof Error) {
				return ex;
			} else {
				return new Error('' + ex);
			}
		}
	}

	async xgroupDestroy(name: string): Promise<number> {
		const result = (await this.#ioRedis.xgroup('DESTROY', this.key, name)) as number; // xgroup destroy always returns number
		return result;
	}

	async xgroupDelconsumer(group: string, consumer: string): Promise<number> {
		const result = (await this.#ioRedis.xgroup('DELCONSUMER', this.key, group, consumer)) as number; // xgroup delconsumer always returns number
		return result;
	}

	async xgroupSetid(group: string, id: string): Promise<true> {

		await this.#ioRedis.xgroup('SETID', this.key, group, id);

		return true;
	}



	/** Do a xpending */
	xpending(group: string, min: string, max: string, count: number, consumer?: string): Promise<XPendingDetailsResult>;
	xpending(group: string): Promise<XPendingSummaryResult>;
	async xpending(group: string, min?: string, max?: string, kount?: number, consumer?: string): Promise<XPendingSummaryResult | XPendingDetailsResult> {

		if (min != null) { // assume details

			// TODO: check that max, detailsCount is kount is defined. 
			const args = [min, max!, '' + kount];
			if (consumer) {
				args.push(consumer)
			}
			// TODO - FIX TYPE
			const rawResult = await this.#ioRedis.xpending(this.key, group, ...args as any) as [string, string, number, number][] | null;
			if (rawResult == null) return rawResult;

			return rawResult.map(arr => { return { id: arr[0], consumer: arr[1], time: arr[2], delivered: arr[3] } })

		} else {
			const rawResult = await this.#ioRedis.xpending(this.key, group) as [number, string | null, string | null, [string, string][] | null];
			const [count, smallest, highest, comsumerArr] = rawResult;

			const consumers = (comsumerArr != null) ? comsumerArr.map(arr => { return { name: arr[0], count: Number(arr[1]) } }) : null;
			return { count, smallest, highest, consumers: consumers };
		}

	}

	async xack(group: string, id: string, ...ids: string[]): Promise<number> {
		ids.unshift(id);
		return this.#ioRedis.xack(this.key, group, ...ids);
	}

	async xclaim(group: string, consumer: string, minIdle: number, ids: string | string[], opts?: XClaimOptions): Promise<XClaimResult<D>> {
		ids = (ids instanceof Array) ? ids : [ids];
		// if (opts?.idle)
		const args: string[] = [];
		if (opts) {

			if (opts.idle != null) {
				args.push('IDLE', '' + opts.idle);
			}

			if (opts.time != null) { // types should prevent idle and time same time
				args.push('TIME', '' + opts.time);
			}

			if (opts.retrycount != null) {
				args.push('RETRYCOUNT', '' + opts.retrycount);
			}

			if (opts.force === true) {
				args.push('FORCE');
			}

		}
		const rawResult = (await this.#ioRedis.xclaim(this.key, group, consumer, minIdle, ...args, ...ids)) as EntryRaw[];

		const entries: StreamGroupEntry<D>[] = [];
		for (const rawEntry of rawResult) {
			const dataArr = rawEntry[1];
			const id = rawEntry[0];
			entries.push({
				id,
				data: (dataArr != null) ? this._dataParser(dataArr, id) : null
			});
		}
		return { group, consumer, entries }
	}


	async xinfo(): Promise<XInfoStreamResult<D> | null> {
		try {
			// TODO - FIX TYPE
			const rawArr = (await this.#ioRedis.xinfo('STREAM', this.key)) as any;
			const rawObj = camelDataParser(rawArr) as XInfoStreamRawObj;
			const firstEntry = (rawObj.firstEntry != null) ? parseEntry(rawObj.firstEntry, this._dataParser, true) : null;
			const lastEntry = (rawObj.lastEntry != null) ? parseEntry(rawObj.lastEntry, this._dataParser, true) : null;

			return { ...rawObj, firstEntry, lastEntry };
		} catch (ex) {
			// NOTE: by design, return null if not exist "ERR no such key" (or any other error for now)
			// TODO: perhaps check error, and throw error if error is not "ERR no such key"
			return null;
		}

	}

	async xinfoGroups(): Promise<XInfoGroup[]> {
		let groups: XInfoGroup[];

		try {
			const rawArr = await this.#ioRedis.xinfo('GROUPS', this.key) as any[][];
			groups = rawArr?.map(item => camelDataParser(item)) ?? [];
		} catch (ex) {
			groups = [];
			// NOTE: by design, return [] if not exist "ERR no such key" (or any other error for now)
			// TODO: perhaps check error, and throw error if error is not "ERR no such key"
		}

		return groups;
	}

	async xinfoConsumers(group: string): Promise<XInfoConsumers[]> {
		let consumers: XInfoGroup[];

		try {
			const rawArr = await this.#ioRedis.xinfo('CONSUMERS', this.key, group) as any[][];
			consumers = rawArr?.map(item => camelDataParser(item)) ?? [];
		} catch (ex) {
			consumers = [];
			// NOTE: by design, return [] if not exist "ERR no such key" (or any other error for now)
			// TODO: perhaps check error, and throw error if error is not "ERR no such key"
		}

		return consumers;
	}

	async list(dir: ListDirection, opts?: ListOptions<D>): Promise<ListResult<D>> {
		const desc = (dir === 'desc') ? true : (dir === 'asc') ? false : null;
		if (desc == null) throw new Error(`REDSTREAM ERROR - .list direction ${dir} not supported`);

		// build the _opts (reassign to get right time)
		const _opts = (opts) ? { ...DEFAULT_LIST_OPTIONS, ...opts } : DEFAULT_LIST_OPTIONS;
		const { batch, limit, match } = _opts;

		// get the from id, default to '+' for desc, and '-' for asc
		const from = _opts.from ?? ((desc) ? '+' : '-');
		// get the options max final value
		const _opts_max_ = (_opts.max === -1) ? Number.MAX_SAFE_INTEGER : _opts.max;
		// if no match function given, then, max can be limit if smaller.
		const max = (match == null && limit < _opts_max_) ? limit : _opts_max_;


		let fetched = 0;
		let matchCount = 0;
		const entries: StreamEntry<D>[] = [];
		let lastFetchedId: string | undefined;
		let fetchFrom: string | null = from;
		let batchSize = batch;
		let first = true; // is the first query (important to count/skip first item on next)

		while (fetched < max && fetchFrom) {
			let batchEntries: StreamEntry<D>[];
			// if the batchSize go over max, then, we reduce it ()
			if (fetched + batchSize > max) {
				batchSize = max - fetched + (first ? 0 : 1); // to add for the extra to batchSize
			}

			// get the bach entries
			if (desc) {
				batchEntries = await this.xrevrange(fetchFrom, '-', batchSize);
			} else {
				batchEntries = await this.xrange(fetchFrom, '+', batchSize);
			}

			// if not the first query, then, remove the first item as it is the last item 
			// of the previous query.
			if (!first) {
				batchEntries.splice(0, 1);
			}

			const batchLength = batchEntries.length;

			// add to total fetched
			fetched += batchLength;

			// if we have a batch length, the process the entries and set next fetchFrom
			if (batchLength > 0) {
				lastFetchedId = batchEntries[batchEntries.length - 1].id;
				fetchFrom = lastFetchedId;

				// if we do not have match function, then, all batchEntries, are elligles, can just slice if bigger than limit
				if (match == null) {
					const sliceLength = (batchEntries.length + matchCount >= limit) ? (limit - matchCount) : batchEntries.length;
					const batchEntriesToAdd = (sliceLength === batchEntries.length) ? batchEntries : batchEntries.slice(0, sliceLength);
					entries.push(...batchEntriesToAdd);
					matchCount += batchEntriesToAdd.length;
				}
				// if we have a batch 
				else {
					for (const entry of batchEntries) {
						const pass = match(entry.data);
						if (pass) {
							matchCount++;
							if (matchCount <= limit) {
								entries.push(entry);
							} else {
								// if above the limit, then, set fetchFrom to null and end the loop
								fetchFrom = null;
								break;
							}
						}
					}
				}

			}

			// if fetch batchLength is smaller than the batch size, means this was the last
			if (batchLength < batch) {
				fetchFrom = null;
			}

			if (first) {
				first = false;
				batchSize += 1; // now need to be one more, to account for the redundant [0]
			}
		}

		const r: ListResult<D> = {
			entries,
			fetched
		};
		if (lastFetchedId) {
			r.lastFetchId = lastFetchedId;
		}
		return r;
	}

}


//#region    ---------- Arg Utils ---------- 
/** Push the BLOCK and COUNT eventual arguments to the array */
function pushXReadOpts(args: string[], stream: string, id: string, xreadOpts?: XReadOptions | XReadGroupOptions) {
	//// Build BLOCK
	const block = xreadOpts?.block;
	if (block === true) {
		args.push('BLOCK', '0');
	} else if (typeof block === 'number' && !isNaN(block)) {
		args.push('BLOCK', '' + block);
	}

	//// Build COUNT
	const count = xreadOpts?.count;
	if (typeof count === 'number' && !isNaN(count)) {
		args.push('COUNT', '' + count);
	}

	if ((<XReadGroupOptions>xreadOpts)?.noack === true) {
		args.push('NOACK');
	}

	args.push('STREAMS', stream);

	//// Build Id
	args.push(id);

}
//#endregion ---------- /Arg Utils ---------- 





//#region    ---------- Parse Result Utils ---------- 
// TODO: needs to find a typed was to merge with parseReadGroupResult
function parseReadResult<D>(streamReadRaw: StreamReadRaw, qid: string, dataParser: DataParser<D>): XReadResult<D>[] {
	const result: XReadResult<D>[] = [];


	for (const streamEntry of streamReadRaw) {
		const entries: StreamEntry<D>[] = [];
		const key = streamEntry[0];
		const streamRawEntries = streamEntry[1];
		const hasEntries = (streamRawEntries.length > 0);
		const low = (hasEntries) ? streamRawEntries[0][0] : null;
		const high = (hasEntries) ? streamRawEntries[streamRawEntries.length - 1][0] : null;
		for (const rawEntry of streamRawEntries) {
			entries.push(parseEntry(rawEntry, dataParser, true));
		}
		result.push({ key, qid, smallest: low, highest: high, entries });
	}

	return result;
}



function parseReadGroupResult<D>(streamReadRaw: StreamReadRaw, qid: string, dataParser: DataParser<D>, group: string, consumer: string): XReadGroupResult<D>[] {
	const result: XReadGroupResult<D>[] = [];


	for (const streamEntry of streamReadRaw) {
		const entries: StreamGroupEntry<D>[] = [];
		const key = streamEntry[0];
		const streamRawEntries = streamEntry[1];
		const hasEntries = (streamRawEntries.length > 0);
		const low = (hasEntries) ? streamRawEntries[0][0] : null;
		const high = (hasEntries) ? streamRawEntries[streamRawEntries.length - 1][0] : null;
		for (const rawEntry of streamRawEntries) {
			entries.push(parseEntry(rawEntry, dataParser));
		}
		result.push({ key, qid, smallest: low, highest: high, group, consumer, entries });
	}

	return result;
}

function parseEntry<D, N extends boolean>(entryRaw: EntryRaw, dataParser: DataParser<D>, dataNotNullable?: N): N extends true ? StreamEntry<D> : StreamEntry<D | null>;
function parseEntry<D>(entryRaw: EntryRaw, dataParser: DataParser<D>, dataNotNullable?: boolean): StreamEntry<D> | StreamEntry<D | null> {
	const id = entryRaw[0];
	const dataArr = entryRaw[1];
	if (dataNotNullable) { // for xgroupread, can't be null
		const data = dataParser(dataArr, id);
		return { id, data };
	} else {
		const data = (dataArr == null) ? null : dataParser(dataArr, id);
		return { id, data };
	}

}

//#endregion ---------- /Parse Result Utils ---------- 


