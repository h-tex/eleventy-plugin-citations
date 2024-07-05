import nunjucks from "nunjucks";
import * as citations from "./citations.js";


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
			// First reference we encounter on this page
			refs = references[this.page.outputPath] = [];

			Object.defineProperty(this.page, "references", {
				get () {
					return references[this.outputPath];
				}
			});
		}

		return citations.render(content, refs, {
			render: info => nunjucks.render(citationTemplate, info)
		});
	}

	config.addGlobalData("references", references);

	config.addFilter("citations", renderCitations);
	config.addPairedShortcode("citations", renderCitations);
}