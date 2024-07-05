/**
 * Citation parsing patterns.
 * Note we do not yet support complex citation styles like [@smith{ii, A, D-Z}, with a suffix],
 * [@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here], or [@smith{}, 99 years later]
 */
let patterns = {};
patterns.citation = /([-~!]*?)@([^\s;,\]]+)/;
patterns.citations = new RegExp(`\\[\\s*(${patterns.citation.source})(\\s*[;,]\\s*(${patterns.citation.source}))*?\\s*\\]`, 'g');

export function parse (content, refs) {
	return [...content.matchAll(patterns.citations)].map(match => {
		let ret = {raw: match[0], start: match.index, end: match.index + match[0].length};
		ret.citations = match[0].slice(1, -1) // Drop brackets
							 .trim().split(";").map(cite => cite.trim()).filter(Boolean)
							 .map(citation => { // Parse citation
								let [, flags, locator] = citation.match(patterns.citation);
								let number = refs.indexOf(locator) + 1 || refs.push(locator);
								return {number, locator, flags};
							 });

		return ret;
	});
}

export function render (content, refs, options) {
	let all = parse(content, refs);

	// Replace in reverse to avoid wrangling changing offsets
	for (let i = all.length - 1; i >= 0; i--) {
		let info = all[i];
		let rendered = options.render(info);

		content = content.slice(0, info.start) + rendered + content.slice(info.end);
	}

	return content;
}