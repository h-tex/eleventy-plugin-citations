import nunjucks from "nunjucks";
import parseCitations from "./parse-citations.js";

/**
 * Citation parsing patterns.
 * Note we do not yet support complex citation styles like [@smith{ii, A, D-Z}, with a suffix],
 * [@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here], or [@smith{}, 99 years later]
 */
let patterns = {};
patterns.citation = /([-~!]*?)@([^\s;,\]]+)/;
patterns.citations = new RegExp(`\\[\\s*(${patterns.citation.source})(\\s*[;,]\\s*(${patterns.citation.source}))*?\\s*\\]`, 'g');

// Eleventy deep clones plain objects, but we want an actual reference to this so we can modify it during templating.
class References {}
const references = new References();

export function processCitations (content, {
	key,
	render = c => `[${c.number}]`
}) {
	references[key] ??= [];
	let refs = references[key];

	content = content.replaceAll(patterns.citations, (match) => {
		let citations = match.slice(1, -1) // Drop brackets
							 .trim().split(";").map(cite => cite.trim()).filter(Boolean)
							 .map(citation => { // Parse citation
								let [, flags, locator] = citation.match(patterns.citation);
								let number = refs.indexOf(locator) + 1 || refs.push(locator);
								return {number, locator, flags};
							 });

		return render(citations);
	});

	// console.log(`Processed ${refs.length} citations for ${key}`);

	return content;
}

export default function (config, {
	citationTemplate = "_includes/_citations.njk"
} = {}) {
	function renderCitations (content) {
		let refs = references[this.page.outputPath];

		if (!refs) {
			refs = references[this.page.outputPath] = [];

			Object.defineProperty(this.page, "references", {
				get () {
					return references[this.outputPath];
				}
			});
		}

		let all = parseCitations(content, refs);

		// Replace in reverse otherwise indices will be off
		for (let i = all.length - 1; i >= 0; i--) {
			let info = all[i];
			let rendered = nunjucks.render(citationTemplate, info);
			// Replace with rendered citation in content
			content = content.slice(0, info.start) + rendered + content.slice(info.end);
		}

		return content;
	}

	config.addGlobalData("references", references);

	config.addFilter("citations", renderCitations);
	config.addFilter("references", function () {
		return references;
	});

	config.addPairedShortcode("citations", renderCitations);
}