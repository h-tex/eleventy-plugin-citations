import { createRequire } from "module";
import { fileURLToPath } from "url";
import citationsPlugin from "../src/index.js";

const require = createRequire(import.meta.url);

// Set CWD to this directory
// This is just to allow the demo to be entirely contained in this directory
// and still use relative paths. No need to do that to use this plugin.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
process.chdir(__dirname);

export default function (config) {
	let data = {
		layout: "page.njk",
		permalink: "{{ page.filePathStem }}.html",

		// Global references
		// Individual files can add their own references too
		// and they will be merged.
		bibliography: ["references.bib"],
	}

	for (let p in data) {
		config.addGlobalData(p, data[p]);
	}

	config.addPlugin(citationsPlugin, {
		// Comment out to use the default style (Vancouver)
		style: "style.csl",
	});

	return {
		markdownTemplateEngine: "njk",
		templateFormats: ["md", "njk"],
		dir: {
			input: ".",
			output: "."
		},
	};
}