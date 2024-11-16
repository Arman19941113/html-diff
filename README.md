# Html Diff

Compare HTML and generate the differences in either a unified view or a side-by-side comparison.

## Install

```
pnpm add @armantang/html-diff
```

## Quick Start

```js
import '@armantang/html-diff/dist/index.css'
import HtmlDiff from '@armantang/html-diff'

const oldHtml = `<div>hello</div>`
const newHtml = `<div>hello world</div>`

const diff = new HtmlDiff(oldHtml, newHtml)
const unifiedContent = diff.getUnifiedContent()
const sideBySideContents = diff.getSideBySideContents()
```

You can use your own styles without import the css file

```js
import HtmlDiff from '@armantang/html-diff'

const oldHtml = `<div>hello</div>`
const newHtml = `<div>hello world</div>`
const diff = new HtmlDiff(oldHtml, newHtml, {
  minMatchedSize: 3,
  classNames: {
    createText: 'cra-txt',
    deleteText: 'del-txt',
    createInline: 'cra-inl',
    deleteInline: 'del-inl',
    createBlock: 'cra-blo',
    deleteBlock: 'del-blo',
  },
})
const unifiedContent = diff.getUnifiedContent()
const sideBySideContents = diff.getSideBySideContents()
```

## Preview

[See online demo...](https://arman19941113.github.io/html-diff/)

![home](https://arman19941113.github.io/html-diff/demo.png)
