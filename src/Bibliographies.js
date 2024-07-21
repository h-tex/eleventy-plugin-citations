import Bibliography from "./Bibliography.js";
import { toArray } from "./util.js";

const outputPaths = {};

export default class BibliographyByPage {
	constructor ({globalBibliography, style, locale}) {
		this.globalBibliography = toArray(globalBibliography);
		this.style = style;
		this.locale = locale;
	}

	create (page, pageBibliography) {
		let { inputPath, outputPath } = page;

		if (!outputPath) {
			throw new Error("Invalid page object:", page);
		}

		pageBibliography = toArray(pageBibliography);
		// TODO Resolve page bibliography relative to this.page.inputPath
		// Removed because rn it’s impossible to tell where each bibliography is coming from
		let allBibliography = [...this.globalBibliography, ...pageBibliography];
		outputPaths[inputPath] = outputPath;
		return this[outputPath] = new Bibliography(allBibliography, this);
	}

	/**
	 * Get a Bibliography instance for a given page reference.
	 * @param {string | EleventyPage} ref
	 * @returns
	 */
	get (ref) {
		let outputPath = getOutputPath(ref);

		if (!outputPath) {
			return;
		}

		let ret = this[outputPath];

		return ret;
	}

	getOrCreate (page, ...createArgs) {
		return this.get(page) ?? this.create(page, ...createArgs);
	}

	clear ({inputPath, outputPath}) {
		outputPath ||= outputPaths[inputPath];

		if (outputPath) {
			this[outputPath]?.clear();
		}
	}
}

function getOutputPath (ref) {
	return typeof ref === "string" ? ref : ref?.outputPath;
}