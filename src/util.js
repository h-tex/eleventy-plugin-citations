import fs from "fs";

export function toArray(value) {
	if (value === null || value === undefined) {
		return [];
	}
	else if (Array.isArray(value)) {
		return value;
	}
	else {
		return [value];
	}
}

export function readTextFile (path, {description = "file", mustNotBeEmpty} = {}) {
	let contents;

	try {
		contents = fs.readFileSync(path, "utf-8");
	}
	catch (e) {
		throw new Error(`Could not read ${description} ${path}. Error was: ${e.message}`, {cause: e});
	}

	if (mustNotBeEmpty && !contents) {
		let Description = description[0].toUpperCase() + description.slice(1);
		throw new Error(`${Description} ${path} cannot be empty.`);
	}

	return contents;
}