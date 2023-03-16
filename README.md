# Html Diff

Generate html content unified or side-by-side differences.

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

## Preview

### unified differences

![home](https://arman19941113.github.io/html-diff/unified.png)

### side-by-side differences

![home](https://arman19941113.github.io/html-diff/sidebyside.png)

