/**
 * Citation parsing patterns.
 * Note we do not yet support complex citation styles like [@smith{ii, A, D-Z}, with a suffix],
 * [@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here], or [@smith{}, 99 years later]
 */
let patterns = {};
patterns.citation = /([-~!]*?)@([^;\]]+)/;
patterns.citationDetails = /(?<flags>[-~!]*?)@(?<id>[^,;{}\]]+)(?<rest>(?<=[,{])[^;\]]+)?/;
patterns.citations = new RegExp(`\\[\\s*(${patterns.citation.source})(\\s*[;,]\\s*(${patterns.citation.source}))*?\\s*\\]`, 'g');

/**
 * @typedef {object} ParsedCitation
 * @property {string} id
 * @property {string} locator
 * @property {boolean} suppressAuthor
 * @property {boolean} authorOnly
 * @property {boolean} composite
 */

/**
 * Parses a single citation string, e.g. "~@foo, p. 42"
 * @param {string} text
 * @returns {ParsedCitation}
 */
export function parseCitation (text) {
	let match = text.match(patterns.citationDetails);

	if (!match) {
		console.warn(`[citations] Skipping invalid citation: ${text}`);
		return null;
	}

	let {groups} = match;
	let flags = {
		suppressAuthor: groups.flags.includes("-"),
		authorOnly: groups.flags.includes("!"),
		composite: groups.flags.includes("~"),
	};

	let ret = {id: groups.id};

	if (groups.rest) {
		ret.locator = groups.rest;
		if (groups.rest.startsWith(",")) {
			ret.locator = ret.locator.slice(1).trim();
		}
	}

	for (let flag in flags) {
		if (flags[flag]) {
			ret[flag] = flags[flag];
		}
	}

	return ret;
}

/**
 * @typedef {object} CitationSequence
 * @property {string} raw
 * @property {number} start
 * @property {number} end
 * @property {ParsedCitation[]} citations
 */

/**
 * Parse a sequence of citations, e.g. "[@foo; @bar]"
 * @param {string} text
 * @returns {CitationSequence[]}
 */
export function parseCitationSequence (text) {
	return text.slice(1, -1) // Drop brackets
			.trim().split(";")
			.map(cite => cite.trim()).filter(Boolean) // Drop empty strings
			.map(parseCitation).filter(Boolean); // Drop invalid citations
}

/**
 * Parse a block of text for citations
 * @param {string} content
 * @returns {CitationSequence[]}
 */
export function parse (content) {
	// Remove comments while preserving indices
	content = content.replace(/<!--.+?-->/gs, match => " ".repeat(match.length));

	return [...content.matchAll(patterns.citations)].map(match => {
		let raw = match[0];
		return {
			raw, start: match.index, end: match.index + raw.length,
			parsed: parseCitationSequence(raw),
		};
	});
}

export function render (content, refs, options) {
	let citationSequences = parse(content);
	let offset = 0;

	for (let citationSequence of citationSequences) {
		let formatted = citationSequence.formatted = refs.cite(citationSequence.parsed);
		let rendered = options.render(formatted);
		content = content.slice(0, citationSequence.start + offset) + rendered + content.slice(citationSequence.end + offset);
		offset += rendered.length - citationSequence.raw.length;
	}

	return content;
}