# Changelogs 
> Legend: `!` change; `+` enhancement; `-` fix; `.` minor

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