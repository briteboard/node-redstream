
export function stringDataSerializer(obj: any): string[] {
	const r = Object.entries(obj).map(e => {
		const val = e[1];
		const valStr = (val != null) ? '' + val : null;
		return [e[0], valStr];
	}).filter(eArr => eArr != null).flat();
	return r as string[]; // the filter above will remove the null string, so, safe to force casting
}


export function objectDataSerializer(obj: any): string[] {
	const r = Object.entries(obj).map(e => {
		const val = e[1];
		let valStr = null;
		if (val != null) {
			if (typeof val === 'string') {
				valStr = val;
			} else if (typeof val === 'object') {
				try {
					valStr = JSON.stringify(val);
				} catch {
					valStr = '' + val;
				}
			} else {
				valStr = '' + val;
			}
		}
		return [e[0], valStr];
	}).filter(eArr => eArr[1] != null).flat();

	return r as string[]; // the filter above will remove the null string, so, safe to force casting
}

export function stringDataParser(arr: string[]): { [k: string]: string } {
	const obj: any = {};
	for (let i = 0; i < arr.length; i += 2) {
		const key = arr[i];
		if (arr.length > i + 1) {
			const val = arr[i + 1];
			obj[key] = val; // here we assume it is a string
		}
	}
	return obj;
}

export function objectDataParser(arr: string[]): { [k: string]: any } {
	const obj: any = {};
	for (let i = 0; i < arr.length; i += 2) {
		const key = arr[i];
		if (arr.length > i + 1) {
			const valStr = arr[i + 1];
			if (valStr.startsWith('[') || valStr.startsWith('{')) {
				try {
					obj[key] = JSON.parse(valStr);
				} catch{
					obj[key] = valStr;
				}
			} else {
				obj[key] = valStr;
			}
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
