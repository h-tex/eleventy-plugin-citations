import fs from "fs";
import nunjucks from "nunjucks";
import CSL from "citeproc";
// import * as util from "./util.js";
import * as citations from "./citations.js";
import * as bib from "./bib.js";

// Eleventy deep clones plain objects, but we want an actual reference to these so we can modify them during templating.
class References {}
const references = new References();

class Bibliography {}
const bib_data = new Bibliography();

export default function (config, {
	citationTemplate = "_includes/_citations.njk",
	style,
	locale,
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

	if (typeof style === "string") {
		style = fs.readFileSync(style, "utf-8");
	}

	if (typeof locale === "string") {
		locale = fs.readFileSync(locale, "utf-8");
	}

	config.addGlobalData("references", references);
	config.addGlobalData("bib_data", bib_data);

	config.addFilter("citations", renderCitations);
	config.addPairedShortcode("citations", renderCitations);

	config.addFilter("format_reference", function (locator, bibliography = this.ctx.bibliography) {
		if (!bibliography) {
			throw new Error("No bibliography file(s) provided, either as data or via the filter.");
		}

		bibliography = Array.isArray(bibliography) ? bibliography : [bibliography];

		let merged = {};
		for (let source of bibliography) {
			let data = typeof source === "object" ? source : (bib_data[source] ??= bib.parse(source));
			Object.assign(merged, data);
		}

		return bib.format.call(this, locator, {bibliography: merged, style, locale});
	})
}