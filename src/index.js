import fs from "fs";
import { fileURLToPath } from "url";
import nunjucks from "nunjucks";

import { toArray } from "./util.js";
import Bibliography from "./Bibliography.js";
import * as citations from "./citations.js";

export { Bibliography };

// Eleventy deep clones plain objects, but we want an actual reference to these so we can modify them during templating.
class ReferencesByPage {}
const references = new ReferencesByPage();

const __dirname = fileURLToPath(new URL("..", import.meta.url));

function defaultRenderCitation (citationTemplate) {
	if (citationTemplate) {
		return info => nunjucks.render(citationTemplate, info);
	}
	else {
		let template = fs.readFileSync(__dirname + "/_includes/_citations.njk", "utf8");
		return info => nunjucks.renderString(template, info);
	}
}

let doiTemplates = {
	url: '<a href="$&" class="doi">$&</a>',
	id: '<a href="https://doi.org/$1" class="doi">$1</a>',
}

export default function (config, {
	citationTemplate,
	citationRender = defaultRenderCitation(citationTemplate),
	style, locale, // defaults set in Bibliography
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
					return references[this.outputPath]?.references ?? [];
				}
			});
		}

		return citations.render(content, refs, {
			render: citationRender,
		});
	}

	config.addGlobalData("referencesByPage", references);

	config.addFilter("citations", renderCitations);
	config.addPairedShortcode("citations", renderCitations);

	config.addFilter("bibliography_citation", function ({id}) {
		let refs = references[this.page.outputPath];
		let ret = refs.format(id);
		return ret.citation ?? `[${id}]`;
	});

	config.addFilter("bibliography_entry", function ({id}, {doi_link} = {}) {
		let refs = references[this.page.outputPath];
		let formatted = refs.format(id);
		let ret = formatted.entry ?? formatted.html;

		if (doi_link) {
			let template = doiTemplates[doi_link] ?? doi_link;
			ret = ret.replaceAll(/https?:\/\/doi\.org\/(10\.\d{4,9}\/[\w.:-]*\w)/gi, template);
		}

		return ret;
	});
}