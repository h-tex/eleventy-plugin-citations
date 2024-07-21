---
bibliography: [references-local.bib]
---

# Demo of eleventy-plugin-citations

<!-- [Back to documentation](../README.md) -->

## Introduction

This is a single citation [@verou_mavo_2016].
These are two citations [@verou_extending_2018; @zhang_wikum_2017].
These are multiple consecutive citations [@bakke_expressive_2016; @bakke_spreadsheet-based_2011; @chang_using_2016; @chang_creating_2014].
Note how every citation is linked to the correct entry in the bibliography, even in cases with multiple consecutive citations.
AFAIK this is the _only_ plugin that can do this.

This is a citation that comes from a bibliography local to this Markdown file, which is not included in the global bibliography [@kowalzcykowski2009yourself].

And this is a missing citation [@citation_needed]. Notice how it’s styled differently?

## Related Work

This is a citation cited again in another section, to better demonstrate backlinks [@verou_mavo_2016].