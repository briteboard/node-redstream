# Changelogs 

> Legend: `!` change; `+` enhancement; `-` fix; `.` minor

## [v0.1.11](https://github.com/briteboard/node-redstream/compare/v0.1.7...v0.1.11) - Tue Feb 20 2021

- `^` list - optimize when no match function by avoiding the matching for loop
- `-` list - fix opts.from that was ignored
- `+` xreadgroup - add block and count support

## [v0.1.7](https://github.com/briteboard/node-redstream/compare/v0.1.6...v0.1.7) - Tue June 1 2020

- `+` .list - added .list query for desc/asc, from, batchSize, max fetched, and match method

## [v0.1.6](https://github.com/briteboard/node-redstream/compare/v0.1.4...v0.1.6) - Tue June 1 2020

- `-` dataParser - exports DataParser<D> type, and put id optional on string and object dataParsers (they are not used)

## [v0.1.4](https://github.com/briteboard/node-redstream/compare/v0.1.3...v0.1.4) - Tue June 1 2020

- `!` ! dataParser - change signature to (id: string, arr: string[]) => D, to allow parsers to handle entry ids. 


## [v0.1.3](https://github.com/briteboard/node-redstream/compare/v0.1.2...v0.1.3) - Tue Apr 28 2020

- Wrap `@types/ioredis` `Redis` type to fix some of the methods signatures (see [@type/ioredis issue](https://github.com/DefinitelyTyped/DefinitelyTyped/issues/44301))

## [v0.1.2](https://github.com/briteboard/node-redstream/compare/v0.1.1...v0.1.2) - Wed Apr 22 2020

- `!` **dataParser** - moved default dataParser to `objectDataParser` (now values starting with `{` or `[` will be `JSON.parsed`, if failed, just just string version will be set)
- `+` **dataSerializer** - add `dataSerializer` to spec. Optional. By Default `objectDataSerializer` that `JSON.stringify` JS object as value (matching the `objectDataParser` default)

## 0.1.1 - Mon Apr 6 2020

- `!` **xgroupCreate** - change default id to '0' (before was '$')
- `+` **groupread** - allows opts.mkgroup to be a string to specify id of the group to be eventually created.


## 0.1.0 - Wed Mar 25 2020

- Initial version. 