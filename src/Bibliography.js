import fs from "fs";
import { BibLatexParser, CSLExporter } from "biblatex-csl-converter";
import CSL from "citeproc";
import defaultStyle from "style-vancouver";
import locale_en_us from "locale-en-us";
import { toArray, readTextFile, splitLossless } from "./util.js";

const patterns = {
	referenceOutput: /^<div class="csl-entry">\s*<div class="csl-left-margin">\s*(?<citation>.+?)\s*<\/div>\s*<div class="csl-right-inline">\s*(?<entry>[\s\S]+?)\s*<\/div>\s*<\/div>$/,
};

const suffixes = {
	"(": ")",
	"[": "]",
	"<sup>": "</sup>",
};

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

	constructor (paths, { style = defaultStyle, locale = locale_en_us, scope }) {
		this.paths = toArray(paths);
		this.style = style;
		this.locale = locale;
		this.scope = scope;
	}

	get initialized () {
		return Boolean(this.data);
	}

	/**
	 * Fetch and parse all bibliography files.
	 * @returns
	 */
	init () {
		if (this.paths.length === 0) {
			console.warn("[citations] No bibliography file(s) provided.");
			return;
		}

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

	#missingReferences = new Set();

	getItem (id) {
		if (this.data[id]) {
			return this.data[id];
		}

		// Create dummy entry so that citeproc doesn’t choke
		return {id, type: "article", title: `Missing entry: ${id}`};
	}

	/**
	 * Add a citation to the bibliography and return parts that can be used to render it
	 * @param {import("./citations.js").ParsedCitation} citations
	 * @returns {}
	 */
	cite (citations) {
		citations = toArray(citations);
		let references = [];

		if (!this.initialized) {
			this.init();
		}

		for (let citation of citations) {
			let id = citation.id;
			this.citations.push(id);

			let reference = this.references.find(r => r.id === id);

			if (!reference) {
				let data = this.data[id];
				let missing = !data;

				if (missing) {
					citation.missing = true;
					this.#missingReferences.add(id);
				}

				reference = {id, data, missing, citations: []};
				this.references.push(reference);
			}

			references.push(reference);
		}

		if (this.formatted) {
			console.warn(`[citations] Citation ${citations.map(c => c.id).join(", ")} found after the bibliography has been formatted. It will not be included.`);
		}

		let result = this.citeproc.appendCitationCluster({
			citationItems: citations,
			properties: {noteIndex: 0}
		}, [], []);

		let [, text, uuid] = result[0];

		for (let reference of references) {
			reference.citations.push(uuid);
		}

		let parts;
		if (citations.length > 1) {
			// Sequences should be handled differently because:
			// — not all citations might be present in the output, e.g. [1, 3–5, 18, 34–60]
			// — they might produce the same output but should be linked to different bibliography items, e.g., [@foo, @bar] and [@bar, @foo]
			// So, we need to help it along by serializing each citation individually and passing it to the function
			let formattedCitations = citations.map(c => {
				let result = this.citeproc.appendCitationCluster({
					citationItems: [c],
					properties: {noteIndex: 0}
				}, [], []);
				return result[0][1];
			});

			parts = parseFormattedCitationSequence(text, citations, formattedCitations);
		}
		else {
			parts = parseFormattedCitationSequence(text, citations);
		}

		let impliedCitations = citations.filter(c => !parts.some(part => part.citation === c));

		if (impliedCitations.length > 0) {
			parts.push(...impliedCitations.map(citation => ({citation, text: ""})));
		}

		return {parts, text, uuid, impliedCitations};
	}

	/**
	 * Build bibliography entries from citations so far
	 */
	build () {
		if (this.#missingReferences.size > 0) {
			let inScope = this.scope ? ` in ${this.scope}` : "";
			console.warn(`[citations] ${ this.#missingReferences.size } missing references${ inScope }: ${[...this.#missingReferences].join(", ")}`);
		}

		let citeprocBibliography = this.citeproc.makeBibliography();
		let ids = citeprocBibliography[0].entry_ids;
		let entries = citeprocBibliography[1];

		// Build an object that maps ids to entries
		this.formatted = Object.fromEntries(ids.map((id, i) => [id, entries[i]]));

		// citeproc returns a string of HTML, but we want the citation and bibliography entries separately
		for (let id in this.formatted) {
			let html = this.formatted[id];
			let match = html.trim().match(patterns.referenceOutput);
			let ret = match ? {...match.groups} : {};
			ret.html = html;
			this.formatted[id] = ret;
		}
	}

	/**
	 * Clear citations and references, but keep the same setup
	 */
	clear () {
		if (!this.initialized) {
			// Nothing to do
			return;
		}

		this.references = [];
		this.citations = [];
		this.formatted = null;
		this.#missingReferences.clear();
		this.citeproc.updateItems([]);
	}

	format (id) {
		if (!this.formatted) {
			// First time we format a reference, we format all of them
			this.build();
		}

		return this.formatted[id];
	}

	/**
	 * Bibliography data from BibTeX files, keyed on path
	 */
	static data = {};

	/**
	 * Read a bibliography file, parse it, and convert it to CSL.
	 * Caches subsequent calls to the exact same path.
	 * @param {string} path
	 * @returns {object}
	 */
	static readFile (path) {
		if (this.data[path] === undefined) {
			try {
				let raw = readTextFile(path, { description: "bibliography file" });

				if (raw === null) {
					// File not found, warning already shown, just return empty object
					return {};
				}
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
}

/**
 * Remove the prefix and suffix (brackets, parens etc) from a citation.
 */
function unwrapCitation (text, prefix) {
	prefix ??= text.match(/(<sup>|\(|\[)/)?.[0] ?? "";
	let suffix = suffixes[prefix] ?? "";

	if (!prefix) {
		// Unknown format or no prefix/suffix
		return text;
	}

	text = text.slice(prefix.length, -suffix.length);
	return {prefix, text, suffix};
}

/**
 * Map a formatted citation sequence back to specific citations.
 * @param {string} originalText - a formatted citation sequence that is produced by citeproc
 * @param {import("./citations.js").ParsedCitation[]} citations - the citations that were used to produce the formatted citation sequence
 * @param {string[]} [formattedCitations] - individual formatted citations that were produced by citeproc for a 2nd pass attempt
 * @returns { {citation, text}[] } an array of parts and citations that can be used to render it.
 */
function parseFormattedCitationSequence (originalText, citations, formattedCitations) {
	// Problem: citeproc returns the whole citation cluster, with brackets and separators
	// but we want to wrap each citation in a template for linking etc!
	// What to do?
	// We’ll have to make some assumptions about the citation format for now, such as what the delimiters can contain.
	let {prefix, text, suffix} = unwrapCitation(originalText);

	let parts;

	if (citations.length === 1) {
		// Whole thing is a single citation
		parts = [{citation: citations[0], text}];
	}
	// If we’re here, we have multiple citations
	else if (formattedCitations) {
		formattedCitations = formattedCitations.map(c => unwrapCitation(c).text.trim());
		parts = splitLossless(text, formattedCitations).map(part => {
			if (part.type === "delimiter") {
				// Here delimiters are the actual citations
				return {citation: citations[part.patternIndex], text: part.text};
			}
			else {
				return part.text;
			}
		});
	}
	else {
		// Find what the separator is
		// E.g. Nature uses semicolons since the actual citations can contain all sorts of characters
		// E.g. (Daskalova et al., 2021; Liang et al., 2016; Watson, 2013)
		let delimiter = text.indexOf(";") > -1 ? /\s*;\s*/g : /\s*[–,]\s*/g;
		let matches = text.match(delimiter) ?? [];
		if (matches.length !== citations.length - 1) {
			// Mismatch between number of citations and delimiters
			return null;
		}

		parts = splitLossless(text, delimiter).map(part => {
			if (part.type === "delimiter") {
				return part.text;
			}
			else {
				return {citation: citations[part.typeIndex], text: part.text};
			}
		});
	}

	parts.unshift(prefix);
	parts.push(suffix);
	return parts;
}