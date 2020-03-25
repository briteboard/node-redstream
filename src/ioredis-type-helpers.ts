

export type StreamName = string;
export type EntryId = string;
export type StreamReadRaw = [StreamName, [EntryId, string[]][]][];
export type EntryRaw = [EntryId, string[]];
