
export function toArray(obj: any): string[] {
	const r = Object.entries(obj).map(e => {
		const val = e[1];
		const valStr = (val != null) ? '' + val : null;
		return [e[0], valStr];
	}).filter(eArr => eArr != null).flat();
	return r as string[]; // the filter above will remove the null string, so, safe to force casting
}


export function stringDataParser(data: string[]): { [k: string]: string } {
	const obj: any = {};
	for (let i = 0; i < data.length; i += 2) {
		const key = data[i];
		if (data.length > i + 1) {
			const val = data[i + 1];
			obj[key] = val; // here we assume it is a string
		}
	}
	return obj;
}

interface ParserOptions {
	asNumber?: string[]
}

export function camelDataParser(arr: any[], opts?: ParserOptions): any {
	const obj: any = {};
	const asNumSet = (opts?.asNumber != null) ? new Set(opts.asNumber) : null;

	for (let i = 0; i < arr.length; i += 2) {
		let key = arr[i] as string;
		if (key.indexOf('-') > -1) {
			const parts = key.split('-');
			key = parts[0] + parts.slice(1).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join('');

		}
		if (arr.length > i + 1) {
			let val: any = arr[i + 1];
			if (typeof val === 'string') {
				if (asNumSet?.has(key)) {
					val = Number(val);
				}
			}
			obj[key] = val; // any time
		}
	}
	return obj;
}
