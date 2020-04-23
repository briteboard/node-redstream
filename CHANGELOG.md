# Changelogs 
> Legend: `!` change; `+` enhancement; `-` fix; `.` minor


## 0.1.2 - Wed Apr 22 2020

- `!` **dataParser** - moved default dataParser to `objectDataParser` (now values starting with `{` or `[` will be `JSON.parsed`, if failed, just just string version will be set)
- `+` **dataSerializer** - add `dataSerializer` to spec. Optional. By Default `objectDataSerializer` that `JSON.stringify` JS object as value (matching the `objectDataParser` default)

## 0.1.1 - Mon Apr 6 2020

- `!` **xgroupCreate** - change default id to '0' (before was '$')
- `+` **groupread** - allows opts.mkgroup to be a string to specify id of the group to be eventually created.


## 0.1.0 - Wed Mar 25 2020

- Initial version. 