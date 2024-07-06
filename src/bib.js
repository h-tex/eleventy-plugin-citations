import fs from "fs";
import { BibLatexParser, CSLExporter } from "biblatex-csl-converter";

export function parse (filename) {
	let rawBib = fs.readFileSync(filename, "utf-8");
	// TODO error handling
	let parsedBib = new BibLatexParser(rawBib, {processUnexpected: true, processUnknown: true}).parse();

	// Use BiBTeX keys as IDs
	let data = Object.fromEntries(Object.values(parsedBib.entries).map(entry => {
		let id = entry.entry_key;
		entry.id = id;
		return [id, entry];
	}));
	// TODO error handling
	return new CSLExporter(data).parse();
}

import CSL from "citeproc";
import locale_en_us from "locale-en-us";
import style_vancouver from "style-vancouver";

export function format (id, {bibliography, style = style_vancouver, locale = locale_en_us}) {
	if (bibliography[id]) {
		let citeproc = new CSL.Engine({
			retrieveItem: id => bibliography[id],
			retrieveLocale: () => locale,
		}, style);
		citeproc.updateItems([id]);

		let result = citeproc.makeBibliography();
// console.log(result);
// process.exit();
		return result[1][0];
	}

	// console.warn(`Reference @${id} not found in bibliography`);
	return id;
}