# eleventy-plugin-citations

This plugin parses Pandoc-style citations in any input files and replaces them with formatted references.
It also stores the references in data that can be used to display a bibliography however and wherever you want.

## Why another plugin?

I developed this plugin over the course of writing my PhD thesis, while being on a pretty tight schedule.
Trust me, I really did not want to write yet another plugin for this unless I absolutely had to.
However, after carefully reviewing all the other plugins I could find, I decided that none of them were suitable for my needs.
Your needs may be different, so I suggest you check them out too:

| Package | Repo | Citation parser | Bbliography parser | Reference formatter |
| ------- | ---- | --------------- | ------------- | ------------- |
[@arothuis/markdown-it-biblatex](https://www.npmjs.com/package/@arothuis/markdown-it-biblatex)	| https://github.com/arothuis/markdown-it-biblatex		| [_(Custom)_](https://github.com/arothuis/markdown-it-biblatex/blob/main/src/parser.js) | [biblatex-csl-converter](https://www.npmjs.com/package/biblatex-csl-converter) [citeproc](https://www.npmjs.com/package/citeproc) |
[eleventy-plugin-citeproc](https://www.npmjs.com/package/eleventy-plugin-citeproc)				| https://github.com/Myllaume/eleventy-plugin-citeproc	| [@zettlr/citr](https://www.npmjs.com/package/@zettlr/citr) | N/A _(Only supports JSON)_ | [citeproc](https://www.npmjs.com/package/citeproc) |
[eleventy-plugin-bibtex](https://www.npmjs.com/package/eleventy-plugin-bibtex)					| https://github.com/Savjee/eleventy-plugin-bibtex		| N/A _(No citation support)_ | [citation-js](https://www.npmjs.com/package/citation-js) | [citation-js](https://www.npmjs.com/package/citation-js) |
[markdown-it-bibliography](https://www.npmjs.com/package/markdown-it-bibliography)				| https://github.com/DerDrodt/markdown-it-bibliography	| [_(Custom)_](https://github.com/DerDrodt/markdown-it-bibliography/blob/main/src/citation-parser.ts) | [biblatex-csl-converter-ts](https://www.npmjs.com/package/biblatex-csl-converter-ts) | [citeproc](https://www.npmjs.com/package/citeproc) |
[markdown-it-cite](https://www.npmjs.com/package/markdown-it-cite) 								| https://github.com/studyathome-internationally/markdown-it-plugins/tree/main/packages/markdown-it-cite | [_(Custom)_](https://github.com/studyathome-internationally/markdown-it-plugins/blob/main/packages/markdown-it-cite/index.js#L29) | [biblatex-csl-converter](https://www.npmjs.com/package/biblatex-csl-converter) | [_(Custom)_](https://github.com/studyathome-internationally/markdown-it-plugins/blob/main/packages/markdown-it-cite/index.js#L305) |

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
I wanted to have the references as part of the data cascade and use actual templates for displaying them.

### Feature: Multiple citation sequences

A lot of my content was Markdown converted from LaTeX with [pandoc](https://pandoc.org/).
I had several citation sequences (e.g. `[@foo; @bar]`), which many plugins did not support.

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
eleventyConfig.addPlugin(citations, {
  citationTemplate: "_includes/_citations.njk"
});
```

All options are optional.
The code snippet above is setting them all to their default values.

## Usage

The plugin adds the following:
- A `citations` filter
- A `citations` paired shortcode

You use whichever of the two is convenient to pick up & format citations in your content.

The plugin also adds a `references` global data object that you can iterate over to display your bibliography.

## Limitations

Still to do before release:
- Formatting of references is not yet implemented.
- Currently only supports numbers for citations (numbers are determined by the order of the citations in the text).

There are certain things I did not need, and thus are deprioritized (see wrt tight deadline above):

- No support for Liquid templates. The plugin imports Nunjucks directly.
That said, as long as your citation template is a Nunjucks template, you should probably be fine.
- The citation template cannot use any of your other 11ty data or any custom filters etc.
This is because it imports Nunjucks directly and does not have access to the 11ty environment.

Happy to merge PRs on these, I just don’t have the time to do them myself.