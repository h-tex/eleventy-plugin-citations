# eleventy-plugin-citations (WIP)

This plugin parses Pandoc-style citations (`[@id1; @id2]`) in any input files and replaces them with formatted references.
It also stores the references in data that can be used to display a bibliography however and wherever you want.

## Why another plugin?

I developed this plugin over the course of writing my PhD thesis, while being on a pretty tight schedule.
Trust me, I really did not want to write yet another plugin for this unless I absolutely had to.
However, after carefully reviewing all the other plugins I could find, I decided that none of them were suitable for my needs.
Your needs may be different, so I suggest you check them out too:

| Package | Repo | Citation parser | Bbliography parser | Reference formatter |
| ------- | ---- | --------------- | ------------- | ------------- |
[@arothuis/markdown-it-biblatex](https://www.npmjs.com/package/@arothuis/markdown-it-biblatex)	| [arothuis/markdown-it-biblatex](https://github.com/arothuis/markdown-it-biblatex)		| [_(Custom)_](https://github.com/arothuis/markdown-it-biblatex/blob/main/src/parser.js) | [biblatex-csl-converter](https://www.npmjs.com/package/biblatex-csl-converter) [citeproc](https://www.npmjs.com/package/citeproc) |
[eleventy-plugin-citeproc](https://www.npmjs.com/package/eleventy-plugin-citeproc)				| [Myllaume/eleventy-plugin-citeproc](https://github.com/Myllaume/eleventy-plugin-citeproc)	| [@zettlr/citr](https://www.npmjs.com/package/@zettlr/citr) | N/A _(Only supports JSON)_ | [citeproc](https://www.npmjs.com/package/citeproc) |
[eleventy-plugin-bibtex](https://www.npmjs.com/package/eleventy-plugin-bibtex)					| [Savjee/eleventy-plugin-bibtex](https://github.com/Savjee/eleventy-plugin-bibtex)		| N/A _(No citation support)_ | [citation-js](https://www.npmjs.com/package/citation-js) | [citation-js](https://www.npmjs.com/package/citation-js) |
[markdown-it-bibliography](https://www.npmjs.com/package/markdown-it-bibliography)				| [DerDrodt/markdown-it-bibliography](https://github.com/DerDrodt/markdown-it-bibliography)	| [_(Custom)_](https://github.com/DerDrodt/markdown-it-bibliography/blob/main/src/citation-parser.ts) | [biblatex-csl-converter-ts](https://www.npmjs.com/package/biblatex-csl-converter-ts) | [citeproc](https://www.npmjs.com/package/citeproc) |
[markdown-it-cite](https://www.npmjs.com/package/markdown-it-cite) 								| [studyathome-internationally/markdown-it-plugins](https://github.com/studyathome-internationally/markdown-it-plugins/tree/main/packages/markdown-it-cite) | [_(Custom)_](https://github.com/studyathome-internationally/markdown-it-plugins/blob/main/packages/markdown-it-cite/index.js#L29) | [biblatex-csl-converter](https://www.npmjs.com/package/biblatex-csl-converter) | [_(Custom)_](https://github.com/studyathome-internationally/markdown-it-plugins/blob/main/packages/markdown-it-cite/index.js#L305) |

### Feature: Bibliography based on what is actually used in the output file, not how you structure your input files

I wanted to be able to break content down into multiple pages and templates and still have a single bibliography at the end.
I.e. a single bibliography for the whole thesis, and a separate, different one for each standalone chapter.
Most plugins were extending `markdown-it`, and thus were unaware of the broader context they were being used in, so they had to be atomic: all citations had to be in the same Markdown file.
Now, you could probably do some weird gymnastics to compile a Markdown file with all your content that you then feed back into eleventy
(thanks [@DmitrySharabin](https://github.com/DmitrySharabin) for the idea!), but that sounded quite contorted.

The way this plugin works, collected references are keyed by `outputPath` so you can have separate bibliographies
for separate files, based on what is actually used on each file.
This also means you can call it as many times as you want on the same content and it will not distort the output.

### Feature: Full templating customization

Most plugins were generating the HTML for the citations and references in JS, providing varying levels of customization.
I wanted to have the references as part of the data cascade and use actual templates for displaying them which provides unparalleled flexibility.

### Feature: Multiple citation sequences that can be linked up correctly

A lot of my content was Markdown converted from LaTeX with [pandoc](https://pandoc.org/).
I had several citation sequences (e.g. `[@foo; @bar]`), which many plugins did not support or had limited support (e.g. only the first was linked).

This is due to how [citeproc](https://www.npmjs.com/package/citeproc) works: it returns a single string with all the citations in it and no info about what is what.
This plugin does **a lot of work** to reverse engineer citeproc’s output to figure out what is what.
Yes, even sequence ranges (e.g. `[1, 3–5, 18, 34–60]`) are correctly linked up.

## Installation

First, install with npm:

```sh
npm install eleventy-plugin-citations --save-dev
```

Then add it to your `.eleventy.js` config file:

```js
import citations from 'eleventy-plugin-citations';
```

Then in your config function:

```js
eleventyConfig.addPlugin(citations);
```

You can also provide options (described below) to customize the plugin behavior, e.g.:

```js
eleventyConfig.addPlugin(citations, {
	citationTemplate: "_includes/partials/_citations.njk",
	bibliography: "references.bib",
	style: "acm-sigchi.csl",
});
```

## Usage

### Rendering citations in the text

The plugin adds the following:
- A `citations` filter
- A `citations` paired shortcode

You use whichever of the two is convenient to pick up & format citations in your content.
See below for the [citation syntax](#citation-syntax).

These do double duty: they pick up references for bibliography, and they format the citations in the text.
**this means that only text that has gone through one of the two will be collected for the bibliography.**
For the filter, you need to also add `| safe` after it so that the HTML it returns can be rendered.

```njk
{{ "See [@doe99; @smith2000]" | citations | safe }}
```

You can provide your own template for rendering the citation via the `citationTemplate` option,
or a function that takes the citation info and returns the text of the formatted citation via the `citationRender` option.

By default, the plugin will use [its internal citation template](_includes/_citations.njk) for this, which looks like this:

```njk
<span class="citations">
	{%- for part in parts -%}
		{%- if part.citation -%}
			<a href="#bib-{{ part.citation.id }}" class="reference" id="ref-bib-{{ part.citation.id }}">{{ part.text }}</a>
		{%- else -%}
			{{ part | safe }}
		{%- endif -%}
	{%- endfor -%}
</span>
```

### Rendering the bibliography

The plugin adds the following:
- A `referencesByPage` global data object that contains references for all pages, keyed by `page.outputpath`
- A `references` property on `page` so you can refer to the page’s references via `page.references`,
which is basically equivalent to `referencesByPage[page.outputPath]`.
Note that this is defined when we encounter the first reference, so on pages with no citations it will be `undefined`, not an empty array.
- A `bibliography_citation` filter that takes an id as input and returns a formatted citation for use in the bibliography.
- A `bibliography_entry` filter that takes an id as input and returns a formatted reference for use in the bibliography.

You can use these however you want to generate the bibliography.
This is an example:

```njk
<h2>Bibliography</h2>

<dl class="references">
	{% for reference in references %}
		<dt><a href="#bib-{{ reference }}" class="reference" id="bib-{{ reference }}">{{ reference | bibliography_citation }}</a></dt>
		<dd>{{ reference | bibliography_entry | safe }}</dd>
	{% endfor %}
</dl>
```

## Citation syntax

The citation syntax supported is a subset of the [Pandoc citation syntax](https://pandoc.org/chunkedhtml-demo/8.20-citation-syntax.html).
Basically ids only, without any locator information.
We also parse the same citation flags from [`markdown-it-biblatex`](https://github.com/arothuis/markdown-it-biblatex#different-citation-modes) but don’t yet do anything with them.

| Example | Description | Parsed? | Supported? |
| ------- | ----------- | ------- | ---------- |
| `[@doe99]` | Single citation | ✅ | ✅ |
| `[@doe99; @smith2000]` | Multiple citations separated by semicolons | ✅ | ✅ |
| `[-@doe99]` | Suppress author | ✅ | 🚫 |
| `[!@doe99]` | Author-only | ✅ | 🚫 |
| `[~@doe99]` | Inline | ✅ | 🚫 |
| `@doe99` | Citation without brackets | 🚫 | 🚫 |
| `[@{https://example.com/bib?name=foobar&date=2000}, p.  33]` | URLs as keys | 🚫 | 🚫 |
| `[see @doe99]` | Prefix | 🚫 | 🚫 |
| `[@doe99, and *passim*]` | Suffix | 🚫 | 🚫 |

## Confuguration Options

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `citationTemplate` | `string` | - | The path to the Nunjucks template that will be used to format the citations. |
| `citationRender` | `function` | _(See prose)_ | A function that takes info about a citation sequence and returns an HTML string |
| `style` | `string` or `object` | [`style-nature`](https://www.npmjs.com/package/style-nature) | The CSL style to use for formatting the references, either as an object or a path to a CSL XML file. |
| `locale` | `string` or `object` | [`locale-en-us`](https://www.npmjs.com/package/locale-en-us) | The locale to use for formatting the references, either as an object or a path to a locale CSL XML file. |
| `bibliography` | `string` or `string[]` | - | One or more global BiBTeX files. In case of duplicate keys, later wins. These will be merged with any BiBTeX files provided via the data cascade and will have lower priority. |

## CSL Styles and Locales

[CSL](https://citationstyles.org/) is an XML-based standard to describe citation styles.
Several popular locales and styles are available as NPM packages, though this plugin has not been testeed with all of them.
An easy way to contribute would be to try the plugin with a new style and add it to the list below (and send PRs to fix any bugs you found!)

### Styles

| Style | Tested? | Text citation | Bibliography citation |
| ----- | ------- | ------------- | --------------------- |
| [Vancouver](https://www.npmjs.com/package/style-vancouver) | ✅ | (1) | 1. |
| [Nature](https://www.npmjs.com/package/style-nature) | ✅ | <sup>1</sup> | [1] |
| [APA](https://www.npmjs.com/package/style-apa) | ✅ | (Doe et al., 1999) | [doe99] |
| [Chicago](https://www.npmjs.com/package/style-chicago) | 🚫 | | |
| [MLA](https://www.npmjs.com/package/style-mla) | 🚫 | | |
| [RSC](https://www.npmjs.com/package/style-rsc) | 🚫 | | |

### Locales

| Locale | Tested? |
| ------ | ------- |
| [en-US](https://www.npmjs.com/package/locale-en-us) | ✅ (default) |
| [en-GB](https://www.npmjs.com/package/locale-en-gb) | 🚫 |
| [fr-FR](https://www.npmjs.com/package/locale-fr-fr) | 🚫 |
| [de-DE](https://www.npmjs.com/package/locale-de-de) | 🚫 |
| [es-ES](https://www.npmjs.com/package/locale-es-es) | 🚫 |

## Limitations

### Citation syntax

While you provide CSL files for the style, the plugin had to make certain assumptions to afford the templating flexibility it provides,
since citeproc provides chunks of text or HTML, with no granularity for the different parts of the citation.

Locators are currently not supported in the citation syntax.
They are mostly parsed, but not output.

### Fundamental limitations

- **The plugin only supports Eleventy v3 and up.**
I _may_ be open in merging PRs to support Eleventy v2 if the changes are minimal,
but I’m not interested in making extensive changes to the codebase to cater to the past.
- **Bibliography cannot come before the last citation.**
The `citations` filter and `{% citations %}` shortcode do double duty: they format the citations AND collect them so they can print out references.
This means that when you print out `page.references`, you are only printing out references that have been collected by then.

### Low priority things

There are certain things I did not need, and thus are deprioritized (see wrt tight deadline above):

- No support for Liquid templates. The plugin imports Nunjucks directly.
That said, as long as your citation template is a Nunjucks template, you should probably be fine.
- The citation template cannot use any of your other 11ty data or any custom filters etc.
This is because it imports Nunjucks directly and does not have access to the 11ty environment.

Happy to merge PRs on these, I just don’t have the time to do them myself.

