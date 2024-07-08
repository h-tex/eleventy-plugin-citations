import fs from "fs";
import { BibLatexParser, CSLExporter } from "biblatex-csl-converter";
import CSL from "citeproc";
import defaultStyle from "style-nature";
import locale_en_us from "locale-en-us";
import { toArray, readTextFile } from "./util.js";

export default class Bibliography {
	/**
	 * First citations only
	 */
	references = [];

	/**
	 * All citations
	 */
	citations = [];

	/**
	 * All relevant bibliography data,
	 * merged from all paths and keyed on id
	 */
	data;

	/**
	 * Formatted bibliography entries, keyed on id
	 * Populated the first time a reference is formatted
	 */
	formatted;

	constructor (paths, {style = defaultStyle, locale = locale_en_us}) {
		this.paths = toArray(paths);

		if (this.paths.length === 0) {
			console.warn("No bibliography file(s) provided.");
		}

		this.style = style;
		this.locale = locale;
	}

	get initialized () {
		return Boolean(this.data);
	}

	/**
	 * Fetch and parse all bibliography files.
	 * @returns
	 */
	init () {
		this.data = Object.assign({}, ...this.paths.map(path => Bibliography.readFile(path)));

		if (typeof this.style === "string") {
			this.style = readTextFile(this.style, {description: "style file", mustNotBeEmpty: true});
		}

		if (typeof this.locale === "string") {
			this.locale = readTextFile(this.locale, {description: "locale file", mustNotBeEmpty: true});
		}

		this.citeproc = new CSL.Engine({
			retrieveItem: id => this.getItem(id),
			retrieveLocale: () => this.locale,
		}, this.style);
	}

	getItem (id) {
		if (this.data[id]) {
			return this.data[id];
		}

		// Create dummy entry so that citeproc doesn’t choke
		return {id, type: "article", title: id};
	}

	/**
	 * Add a citation to the bibliography and return parts that can be used to render it
	 * @param {import("./citations.js").ParsedCitation} citations
	 * @returns {}
	 */
	cite (citations) {
		citations = toArray(citations);

		for (let citation of citations) {
			this.citations.push(citation.id);

			if (!this.references.includes(citation.id)) {
				this.references.push(citation.id);
			}
		}

		if (!this.initialized) {
			this.init();
		}

		if (this.formatted) {
			console.warn(`Citing ${ids.join(", ")} after formatting the bibliography.`);
		}

		let result = this.citeproc.appendCitationCluster({
			citationItems: citations,
			properties: {noteIndex: 0}
		}, [], []);

		// Problem: citeproc returns the whole citation cluster, with brackets and separators
		// but we want to wrap each citation in a template for linking etc!
		// what to do?
		// We’ll make some assumptions about the citation format for now, such as that the citation is in
		let [, text, uuid] = result[0];
		let ret = [];
		let offset = 0; // character offset
		let index = 0; // index of citation
		// Iterate over delimiters. Anything between consecutive delimiters is a citation
		for (let match of text.matchAll(/\s*[()\[\]–,]\s*/g)) {
			let delimiter = match[0];
			let start = match.index;
			let end = start + delimiter.length;
			if (start > offset) {
				// Citation
				let citation = citations[index++];
				ret.push({citation, text: text.slice(offset, start)});
			}
			ret.push(delimiter);
			offset = end;
		}
		result = {parts: ret, text, uuid};
		// console.log(citations.map(c => c.id), result);

		return result;
		// return this.references.indexOf(citations[0].id) + 1;
	}

	build () {
		// this.citeproc.updateItems(this.citations);
		let citeprocBibliography = this.citeproc.makeBibliography();
		let ids = citeprocBibliography[0].entry_ids;
		let entries = citeprocBibliography[1];

		// Build an object that maps ids to entries
		this.formatted = Object.fromEntries(ids.map((id, i) => [id, entries[i]]));
	}

	format (id) {
		if (!this.formatted) {
			// First time we format a reference, we format all of them
			this.build();
		}

		return this.formatted[id];
	}

	/**
	 * Read a bibliography file, parse it, and convert it to CSL.
	 * Caches subsequent calls to the exact same path.
	 * @param {string} path
	 * @returns {object}
	 */
	static readFile (path) {
		if (!this.data[path]) {
			try {
				let raw = readTextFile(path, {description: "bibliography file", mustNotBeEmpty: true});
				let parsed;

				try {
					parsed = new BibLatexParser(raw, {processUnexpected: true, processUnknown: true}).parse();
				}
				catch (e) {
					throw new Error(`Could not parse ${path} as BiBTeX. Error was: ${e.message}`);
				}

				// Use BiBTeX keys as IDs
				let data = Object.fromEntries(Object.values(parsed.entries).map(entry => {
					let id = entry.entry_key;
					return [entry.id = id, entry];
				}));
				// TODO error handling

				try {
					this.data[path] = new CSLExporter(data).parse();
				}
				catch (e) {
					throw new Error(`Could not convert ${path} to CSL. Error was: ${e.message}`);
				}
			}
			catch (e) {
				// Save error in this.data[path] otherwise we’ll keep trying to fetch this file
				throw this.data[path] = e;
			}
		}

		return this.data[path];
	}

	static data = {};
}