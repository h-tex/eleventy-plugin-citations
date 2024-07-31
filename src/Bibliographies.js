import Bibliography from "./Bibliography.js";
import { toArray } from "./util.js";

const urls = {};

export default class BibliographyByPage {
	constructor ({globalBibliography, style, locale}) {
		this.globalBibliography = toArray(globalBibliography);
		this.style = style;
		this.locale = locale;
	}

	create (page, pageBibliography) {
		let { inputPath, url } = page;

		if (!url) {
			throw new Error("Invalid page object:", page);
		}

		pageBibliography = toArray(pageBibliography);
		// TODO Resolve page bibliography relative to this.page.inputPath
		// Removed because rn it’s impossible to tell where each bibliography is coming from
		let allBibliography = [...this.globalBibliography, ...pageBibliography];
		urls[inputPath] = url;

		return this[url] = new Bibliography(allBibliography, {
			style: this.style,
			locale: this.locale,
			scope: url
		});
	}

	/**
	 * Get a Bibliography instance for a given page reference.
	 * @param {string | EleventyPage} ref
	 * @returns
	 */
	get (ref) {
		let url = getURL(ref);

		if (!url) {
			return;
		}

		let ret = this[url];

		return ret;
	}

	getOrCreate (page, ...createArgs) {
		return this.get(page) ?? this.create(page, ...createArgs);
	}

	clear ({inputPath, url}) {
		url ||= urls[inputPath];

		if (url) {
			this[url]?.clear();
		}
	}
}

function getURL (ref) {
	return typeof ref === "string" ? ref : ref?.url;
}