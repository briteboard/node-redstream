
import { Redis } from 'ioredis';
import { EntryRaw } from './ioredis-type-helpers.js';


/////////////////////
// Module encapsulating the redstream types and interfaces. 
////

export interface RedStream<D = DefaultEntryData> {
	readonly key: string;
	readonly ioRedis: Redis;
	readonly dataParser: DataParser<D>;

	/** Do a xtrim with the approximate default ~ (perf first). Set exact=true to have exact triming. */
	xtrim(count: number, exact?: boolean): Promise<number>

	xlen(): Promise<number>;

	/** Do a xadd for dataObject D with an optional maxlen (approximate). */
	xadd(dataObject: D, maxlenApproximate?: number): Promise<string>;
	/** Do a xadd for dataObject D with an optional options. */
	xadd(dataObject: D, opts?: XAddOptions): Promise<string>;
	/** 
	 * Do mulitple xadd for each dataObject (bached in a pipeline) with an optional maxlen (approximate).
	 * Note: Later the maxlenApproximate would probably be an additional xtrim in the pipeline (to avoid to do a maxlen in each xadd)
	 */
	xadd(dataObject: D[], maxlenApproximate?: number): Promise<string[]>;
	/** 
	 * Do mulitple xadd for each dataObject (bached in a pipeline) with an optional options 
	 * Note: that later the opts.maxlen would probably be an additional xtrim in the pipeline (to avoid to do a maxlen in each xadd)
	 */
	xadd(dataObjects: D[], opts?: XAddsOptions): Promise<string[]>;

	/** Do a xread from 0 by default */
	xread(): Promise<XReadResult<D> | null>;
	/** Do a xread from a specific id */
	xread(id: string): Promise<XReadResult<D> | null>;
	/** Do a xread from 0 if opts.block undefined or false, otherwise, default to $ */
	xread(opts: XReadOptions): Promise<XReadResult<D> | null>;
	/** Do a xread from specific id and some options */
	xread(id: string, opts: XReadOptions): Promise<XReadResult<D> | null>;

	xrange(start: string, end: string, count?: number): Promise<StreamEntry<D>[]>;
	xrevrange(end: string, start: string, count?: number): Promise<StreamEntry<D>[]>;

	/** Do a xdel */
	xdel(...ids: string[]): Promise<number>;

	/** Do a xgroup create (default id: 0 and mkstream: true). Return true if group was created, or Error if error while in creation (shy error) */
	xgroupCreate(name: string, opts?: { id?: string, mkstream?: boolean }): Promise<true | Error>;
	/** Do a xgroup destroy, which returns 1 if deleted, or 0 if not (or anything else) */
	xgroupDestroy(name: string): Promise<number>;
	/** Do a xgroup delconsumer, */
	xgroupDelconsumer(group: string, consumer: string): Promise<number>;
	/** Do a xgroup setid. Return true or throw exception */
	xgroupSetid(group: string, id: string): Promise<true>;

	/** Do a xreadgroup with > by default, and MKGROUP by default with '0' */
	xreadgroup(group: string, consumer: string): Promise<XReadGroupResult<D> | null>;
	/** Do a xreadgroup with '>' and some options (block) , and MKGROUP by default*/
	xreadgroup(group: string, consumer: string, opts: XReadGroupOptions): Promise<XReadGroupResult<D> | null>;
	/** Do a xreadgroup with a specific id (if not '>', redis returns pending messages only) */
	xreadgroup(group: string, consumer: string, id: string): Promise<XReadGroupResult<D> | null>;
	/** DO a xreadgroup with a custom id (if not '>' then return, redis returns pending messages only) */
	xreadgroup(group: string, consumer: string, id: string, opts: XReadGroupOptions): Promise<XReadGroupResult<D> | null>;

	/** Do a xpending */
	xpending(group: string, min: string, max: string, count: number, consumer?: string): Promise<XPendingDetailsResult>;
	xpending(group: string): Promise<XPendingSummaryResult>;

	/** Do a xack */
	xack(group: string, id: string, ...ids: string[]): Promise<number>

	/** 
	 * Do a xclaim
	 * XCLAIM key group consumer min-idle-time ID [ID ...] [IDLE ms] [TIME ms-unix-time] [RETRYCOUNT count] [FORCE] 
	 * TODO: needs to implement justId
	 */
	xclaim(group: string, consumer: string, minIdle: number, ids: string | string[], opts?: XClaimOptions): Promise<XClaimResult<D>>

	/** Do a xinfo stream on this stream */
	xinfo(): Promise<XInfoStreamResult<D> | null>;

	/** Do a xinfo groups on this stream */
	xinfoGroups(): Promise<XInfoGroup[]>

	/** Do a xinfo consumers on this stream */
	xinfoConsumers(group: string): Promise<XInfoGroup[]>

	list(dir: ListDirection, opts?: ListOptions<D>): Promise<ListResult<D>>
}


export interface DataParser<D> {
	(arr: string[], id: string): D
}

export interface DataSerializer<D> {
	(obj: D): string[]
}



//#region    ---------- Option Types ---------- 
export interface XAddBaseOptions {
	/** The MAXLEN argument (approximate by default, perf first) */
	maxlen?: number;

	/** By default, xadd is approximate '~' (maxlenExact = false). Set maxlenExact = true remove the '~' and have it exact */
	maxlenExact?: boolean;
}

// for symetry
export interface XAddsOptions extends XAddBaseOptions { }

export interface XAddOptions extends XAddBaseOptions {
	/** The id of the new entry, default is '*' */
	id?: string;
}

export type XReadOptions = { count?: number, block?: boolean | number }

export type XReadGroupOptions = XReadOptions & {
	/* (default false) */
	noack?: boolean;
	/* Will automatically create the group if not exist (default true with default xgroupCreate id '0'), if false will throw exception if group not created. If string, will use it as the xgroupCreate id */
	mkgroup?: boolean | string;
}

export type XClaimBaseOptions = {
	retrycount?: number
	force?: boolean
}

export type XClaimOptions = { idle?: number, time?: void } & XClaimBaseOptions | { time?: number, idle?: void } & XClaimBaseOptions;

export type ListDirection = 'desc' | 'asc';

export interface ListOptions<D = any> {
	/** The stream entry id to start, default '+' for 'desc', and '-' for 'asc' */
	from?: string;

	/** Limit of matching entries (stop fetching after it is met). Default 1000 */
	limit?: number;

	/** batch size for each x..range count query. Default 1000 */
	batch?: number;

	/** 
	 * Maximum fetched entries (regardless if matched or not) after which no more fetch will be perform. 
	 * -1 no max (until no data)
	 * Defaault -1
	 * */
	max?: number;

	/** Match function on the parsed data */
	match?: (data: D) => boolean;
}

export const DEFAULT_LIST_OPTIONS: Required<Omit<ListOptions, 'from' | 'match'>> & Pick<ListOptions, 'from' | 'match'> = Object.freeze({
	limit: 1000,
	batch: 1000,
	max: -1 // no fetch max
});

//#endregion ---------- /Option Types ---------- 

//#region    ---------- Result Types ---------- 
export type DefaultEntryData = { [k: string]: string | object };

export interface StreamEntry<D = DefaultEntryData> {
	id: string,
	data: D
}

export interface StreamGroupEntry<D = DefaultEntryData> extends StreamEntry<D | null> {

}

export interface XReadResult<D = DefaultEntryData> {
	key: string,
	qid: string,
	smallest: string | null;
	highest: string | null;
	entries: StreamEntry<D>[];
}

export interface XReadGroupResult<D = DefaultEntryData> extends XReadResult<D | null> {
	group: string;
	consumer: string;
}

export interface XPendingSummaryResult {
	/** Number of pending entries in this group */
	count: number;
	/** lowest id */
	smallest: string | null;
	highest: string | null;
	consumers: { name: string, count: number }[] | null;
}

export type XPendingDetailsResult = {
	id: string;
	consumer: string;
	time: number;
	delivered: number;
}[] | null;

export interface XClaimResult<D = DefaultEntryData> {
	group: string;
	consumer: string;
	entries: StreamGroupEntry<D>[];
}


export interface XInfoStreamRawObj {
	length: number;
	radixTreeKeys: number;
	radixTreeNodes: number;
	groups: number;
	lastGeneratedId: string;
	firstEntry: EntryRaw | null;
	lastEntry: EntryRaw | null;
}

export interface XInfoStreamResult<D> extends Omit<XInfoStreamRawObj, 'firstEntry' | 'lastEntry'> {
	firstEntry: StreamEntry<D> | null;
	lastEntry: StreamEntry<D> | null;
}

export interface XInfoGroup {
	name: string;
	consumers: number;
	pending: number;
	lastDeliveredId: string;
}

export interface XInfoConsumers {
	name: string;
	consumers: number;
	pending: number;
	lastDeliveredId: string;
}

export interface ListResult<D> {
	entries: StreamEntry<D>[];
	fetched: number;
	lastFetchId?: string;
}

//#endregion ---------- /Result Types ---------- 