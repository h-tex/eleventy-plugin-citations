import fs from "fs";
import nunjucks from "nunjucks";

import { toArray } from "./util.js";
import Bibliography from "./Bibliography.js";
import * as citations from "./citations.js";

export { Bibliography };

// Eleventy deep clones plain objects, but we want an actual reference to these so we can modify them during templating.
class ReferencesByPage {}
const references = new ReferencesByPage();

export default function (config, {
	citationTemplate = "_includes/_citations.njk",
	style,
	locale,
	bibliography,
} = {}) {
	let globalBibliography = toArray(bibliography);

	function renderCitations (content) {
		let refs = references[this.page.outputPath];

		if (!refs) {
			// First citation we encounter on this page
			let pageBibliography = toArray(this.ctx.bibliography);

			refs = references[this.page.outputPath] = new Bibliography([...globalBibliography, ...pageBibliography], {style, locale});

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

	config.addFilter("format_reference", function (id) {
		let refs = references[this.page.outputPath];
		return refs.format(id);
	})
}