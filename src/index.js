import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { RenderPlugin } from "@11ty/eleventy";

import { toArray } from "./util.js";
import Bibliography from "./Bibliography.js";
import Bibliographies from "./Bibliographies.js";
import * as citations from "./citations.js";

export { Bibliography };

const __dirname = fileURLToPath(new URL("..", import.meta.url));

let doiTemplates = {
	url: '<a href="$&" class="doi">$&</a>',
	id: '<a href="https://doi.org/$1" class="doi">$1</a>',
};

export default async function (config, {
	citationTemplate = __dirname + "/_includes/_citations.njk",
	citationRender,
	style, locale, // defaults set in Bibliography
	bibliography: globalBibliography,
} = {}) {
	const references = new Bibliographies({globalBibliography, style, locale});
	let fileRenderer;
	const render = citationRender ?? (async function(...args){
		fileRenderer ??= await RenderPlugin.File(citationTemplate);
		return fileRenderer.call(this, ...args);
	});

	async function renderCitations (content) {
		let refs = references.getOrCreate(this.page, this.ctx.bibliography);
		return await citations.render(content, refs, { render });
	}

	config.addGlobalData("referencesByPage", references);
	config.addGlobalData("eleventyComputed", {
		references (data) {
			if (data.page?.outputPath) {
				let refs = references.getOrCreate(data.page, data.bibliography);
				return refs?.references ?? [];
			}
		}
	});

	config.addFilter("citations", renderCitations);
	config.addPairedShortcode("citations", renderCitations);

	config.addFilter("bibliography_citation", function ({id}) {
		let refs = references.get(this.page);
		let ret = refs.format(id);
		return ret.citation ?? `[${id}]`;
	});

	config.addFilter("bibliography_entry", function ({id}, {doi_link} = {}) {
		let refs = references.get(this.page);
		let formatted = refs.format(id);
		let ret = formatted.entry ?? formatted.html;

		// --- is used to create em dashes in LaTeX
		ret = ret.replaceAll(/-{3}/g, "—");

		if (doi_link) {
			let template = doiTemplates[doi_link] ?? doi_link;
			ret = ret.replaceAll(/https?:\/\/doi\.org\/(10\.\d{4,9}\/[\w.:\/-]*\w)/gi, template);
		}

		return ret;
	});

	// Run me before --watch or --serve re-runs
	config.on("eleventy.beforeWatch", async (changedFiles) => {
		for (let inputPath of changedFiles) {
			references.clear({inputPath});
		}
	});
}