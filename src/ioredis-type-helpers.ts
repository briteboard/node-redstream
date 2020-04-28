

export type StreamName = string;
export type EntryId = string;
export type EntryRaw = [EntryId, string[]];
export type StreamReadRaw = [StreamName, EntryRaw[]][]; // [string, [string, string[]][]][]
