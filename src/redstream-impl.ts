import IORedis from 'ioredis';
import { EntryRaw, StreamReadRaw } from './ioredis-type-helpers';
import { DataParser, DefaultEntryData, RedStream, StreamEntry, StreamGroupEntry, XAddOptions, XAddsOptions, XClaimOptions, XClaimResult, XInfoConsumers, XInfoGroup, XInfoStreamRawObj, XInfoStreamResult, XPendingDetailsResult, XPendingSummaryResult, XReadGroupOptions, XReadGroupResult, XReadOptions, XReadResult } from './redstream';
import { camelDataParser, toArray } from './utils';

/////////////////////
// Module encapsulating the RedStream implementation. NOT to be called directly, default module redstream() factory.
////

const DEFAULT_XGROUPCREATE_ID = '0';

export class RedStreamImpl<D = DefaultEntryData> implements RedStream<D> {
	readonly key: string;

	private readonly _ioRedis: IORedis.Redis;
	get ioRedis() { return this._ioRedis };

	private readonly _dataParser: DataParser<D>;
	get dataParser() { return this._dataParser };

	constructor(ioRedis: IORedis.Redis, name: string, parser: (nvArr: string[]) => D) {
		this.key = name;
		this._ioRedis = ioRedis;
		this._dataParser = parser;
	}

	async xtrim(count: number, exact = false): Promise<number> {
		const args = (exact) ? ['' + count] : ['~', '' + count];
		return this._ioRedis.xtrim(this.key, 'MAXLEN', ...args);
	}

	async xlen(): Promise<number> {
		return await this._ioRedis.xlen(this.key);
	}


	xadd(obj: D, maxlen?: number): Promise<string>;
	xadd(obj: D, opts?: XAddOptions): Promise<string>;
	xadd(obj: D[], maxlen?: number): Promise<string[]>;
	xadd(objs: D[], opts?: XAddsOptions): Promise<string[]>;
	async xadd(obj: D | D[], opts_or_maxlen?: XAddOptions | number): Promise<string | string[]> {

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
			const batch = this._ioRedis.pipeline();
			for (const itemObj of obj) {
				const arr = toArray(itemObj);
				//const id = await this.ioRedis.xadd(this.key, ...[...args, ...arr]);
				//result.push(id);
				batch.xadd(this.key, ...[...args, ...arr]);
			}
			const execResult = await batch.exec(); // [error, id][]
			return execResult.map(item => item[1]) as string[];
		} else {
			const arr = toArray(obj);
			args.push(id);
			return this._ioRedis.xadd(this.key, ...[...args, ...arr]);
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
		const rawResult = await this._ioRedis.xread(args);
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
			rawResult = await this._ioRedis.xreadgroup('GROUP', group, consumer, args);
		} catch (ex) {
			const mkgroup = opts?.mkgroup ?? true; // by default we create the group
			if (mkgroup && ex?.message?.includes('NOGROUP')) {
				await this.xgroupCreate(group); // create the group (won't through an exception, but group might already exist)
				rawResult = await this._ioRedis.xreadgroup('GROUP', group, consumer, args); // if fail this time, pass it through
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

		const rawXRangeResult = await this._ioRedis.xrange(this.key, ...args); // TS-NOTE here the args might be 4 strings, compatible with js call

		return rawXRangeResult.map(rawEntry => parseEntry(rawEntry, this._dataParser, true));

	}

	async xrevrange(end: string, start: string, count?: number): Promise<StreamEntry<D>[]> {
		const args = [end, start] as [string, string];
		if (count != null) {
			args.push('COUNT', '' + count);
		}

		const rawXRangeResult = await this._ioRedis.xrevrange(this.key, ...args); // TS-NOTE here the args might be 4 strings, compatible with js call

		return rawXRangeResult.map(rawEntry => parseEntry(rawEntry, this._dataParser, true));

	}

	async xdel(...ids: string[]): Promise<number> {
		return this._ioRedis.xdel(this.key, ...ids);
	}

	/** Create a group for a given stream. By default does a MKSTREAM, can be turned off. */
	async xgroupCreate(group: string, opts?: { id?: string, mkstream?: false }): Promise<true | Error> {
		// XGROUP CREATE s1 g1 $ MKSTREAM
		const args = ['CREATE', this.key, group, opts?.id ?? DEFAULT_XGROUPCREATE_ID];
		if (opts?.mkstream !== false) {
			args.push('MKSTREAM'); // by default, do the MKSTREAM (create stream if no exist)
		}
		try {
			await this._ioRedis.xgroup(args);
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
		const result = (await this._ioRedis.xgroup('DESTROY', this.key, name)) as number; // xgroup destroy always returns number
		return result;
	}

	async xgroupDelconsumer(group: string, consumer: string): Promise<number> {
		const result = (await this._ioRedis.xgroup('DELCONSUMER', this.key, group, consumer)) as number; // xgroup delconsumer always returns number
		return result;
	}

	async xgroupSetid(group: string, id: string): Promise<true> {

		await this._ioRedis.xgroup('SETID', this.key, group, id);

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
			const rawResult = await this._ioRedis.xpending(this.key, group, ...args) as [string, string, number, number][] | null;
			if (rawResult == null) return rawResult;

			return rawResult.map(arr => { return { id: arr[0], consumer: arr[1], time: arr[2], delivered: arr[3] } })

		} else {
			const rawResult = await this._ioRedis.xpending(this.key, group) as [number, string | null, string | null, [string, string][] | null];
			const [count, smallest, highest, comsumerArr] = rawResult;

			const consumers = (comsumerArr != null) ? comsumerArr.map(arr => { return { name: arr[0], count: Number(arr[1]) } }) : null;
			return { count, smallest, highest, consumers: consumers };
		}

	}

	async xack(group: string, id: string, ...ids: string[]): Promise<number> {
		ids.unshift(id);
		return this._ioRedis.xack(this.key, group, ...ids);
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
		const rawResult = await this._ioRedis.xclaim(this.key, group, consumer, minIdle, ...args, ...ids);

		const entries: StreamGroupEntry<D>[] = [];
		for (const rawEntry of rawResult) {
			const dataArr = rawEntry[1];
			entries.push({
				id: rawEntry[0],
				data: (dataArr != null) ? this._dataParser(dataArr) : null
			});
		}
		return { group, consumer, entries }
	}


	async xinfo(): Promise<XInfoStreamResult<D> | null> {
		try {
			const rawArr = await this._ioRedis.xinfo('STREAM', this.key);
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
			const rawArr = await this._ioRedis.xinfo('GROUPS', this.key) as any[][];
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
			const rawArr = await this._ioRedis.xinfo('CONSUMERS', this.key, group) as any[][];
			consumers = rawArr?.map(item => camelDataParser(item)) ?? [];
		} catch (ex) {
			consumers = [];
			// NOTE: by design, return [] if not exist "ERR no such key" (or any other error for now)
			// TODO: perhaps check error, and throw error if error is not "ERR no such key"
		}

		return consumers;
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
function parseReadResult<D>(streamReadRaw: StreamReadRaw, qid: string, dataParser: (nvArr: string[]) => D): XReadResult<D>[] {
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



function parseReadGroupResult<D>(streamReadRaw: StreamReadRaw, qid: string, dataParser: (nvArr: string[]) => D, group: string, consumer: string): XReadGroupResult<D>[] {
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
	if (dataNotNullable) {
		const data = dataParser(dataArr);
		return { id, data };
	} else {
		const data = (dataArr == null) ? null : dataParser(dataArr);
		return { id, data };
	}

}

//#endregion ---------- /Parse Result Utils ---------- 



