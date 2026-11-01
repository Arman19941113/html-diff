import { describe, expect, it } from 'vitest'
import HtmlDiff from '../src'

const mark = (type: 'create' | 'delete', text: string) =>
  `<span class="html-diff-${type}-text-wrapper">${text}</span>`

describe('quoted HTML attributes', () => {
  describe.each([
    ['double quotes', 'title="x > y"', 'title="x > z"'],
    ['single quotes', "title='x > y'", "title='x > z'"],
    ['mixed quotes', `title="it's > y" data-label='say "hi" > y'`, `title="it's > z" data-label='say "hi" > z'`],
    ['multiple lines', 'title="x >\ny" data-label="&quot; > &gt;"', 'title="x >\nz" data-label="&quot; > &gt;"'],
  ])('%s', (_name, oldAttributes, newAttributes) => {
    const oldTag = `<a ${oldAttributes}>`
    const newTag = `<a ${newAttributes}>`

    it('preserves equal HTML in both views', () => {
      const html = `${oldTag}hello</a>`
      const diff = new HtmlDiff(html, html)
      expect(diff.getUnifiedContent()).toBe(html)
      const synced = `<a data-seq="1" ${oldAttributes}>hello</a>`
      expect(diff.getSideBySideContents()).toEqual([synced, synced])
    })

    it.each(['create', 'delete'] as const)('preserves the opening tag on text %s and assigns data-seq', type => {
      const plain = `${oldTag}hello</a>`
      const extended = `${oldTag}hello world</a>`
      const diff = new HtmlDiff(
        type === 'create' ? plain : extended,
        type === 'create' ? extended : plain,
      )
      expect(diff.getUnifiedContent()).toBe(`${oldTag}hello${mark(type, ' world')}</a>`)
      const syncedTag = `<a data-seq="1" ${oldAttributes}>`
      const unchanged = `${syncedTag}hello</a>`
      const changed = `${syncedTag}hello${mark(type, ' world')}</a>`
      expect(diff.getSideBySideContents()).toEqual(
        type === 'create' ? [unchanged, changed] : [changed, unchanged],
      )
    })

    it('keeps text replacements outside the opening tag', () => {
      const diff = new HtmlDiff(`${oldTag}hello</a>`, `${oldTag}world</a>`)
      expect(diff.getUnifiedContent()).toBe(
        `${oldTag}${mark('delete', 'hello')}${mark('create', 'world')}</a>`,
      )
      expect(diff.getSideBySideContents()).toEqual([
        `${oldTag}${mark('delete', 'hello')}</a>`,
        `${oldTag}${mark('create', 'world')}</a>`,
      ])
    })

    it('uses the new attributes in unified view and preserves each side', () => {
      const diff = new HtmlDiff(`${oldTag}hello</a>`, `${newTag}hello</a>`)
      expect(diff.getUnifiedContent()).toBe(`${newTag}hello</a>`)
      expect(diff.getSideBySideContents()).toEqual([
        `${oldTag}hello</a>`,
        `${newTag}hello</a>`,
      ])
    })

    it('handles simultaneous attribute and text replacements', () => {
      const diff = new HtmlDiff(`${oldTag}hello</a>`, `${newTag}world</a>`)
      expect(diff.getUnifiedContent()).toBe(
        `${newTag}${mark('delete', 'hello')}${mark('create', 'world')}</a>`,
      )
      expect(diff.getSideBySideContents()).toEqual([
        `${oldTag}${mark('delete', 'hello')}</a>`,
        `${newTag}${mark('create', 'world')}</a>`,
      ])
    })

    it.each(['create', 'delete'] as const)('preserves complete tags on element %s', type => {
      const html = `${oldTag}hello</a>`
      const diff = new HtmlDiff(type === 'create' ? '' : html, type === 'create' ? html : '')
      const changed = `${oldTag}${mark(type, 'hello')}</a>`
      expect(diff.getUnifiedContent()).toBe(changed)
      expect(diff.getSideBySideContents()).toEqual(
        type === 'create' ? ['', changed] : [changed, ''],
      )
    })
  })

  it('does not insert data-seq into tag-like attribute content on the equal fast path', () => {
    const html = '<a title="x > <b>">hello</a><p>end</p>'
    const diff = new HtmlDiff(html, html)
    expect(diff.getUnifiedContent()).toBe(html)
    const synced = '<a data-seq="1" title="x > <b>">hello</a><p data-seq="2">end</p>'
    expect(diff.getSideBySideContents()).toEqual([synced, synced])
  })

  it.each([
    '<br title="x > y">',
    "<input value='x > y' />",
    '<img alt="x > y" src="a.png">',
    '<video title="x > y"><source src="a.mp4"></video>',
    '<picture title="x > y"><source srcset="a.png"><img src="a.png"></picture>',
  ])('preserves special tag %s while surrounding text changes', tag => {
    const diff = new HtmlDiff(`<div>${tag}hello</div>`, `<div>${tag}hello world</div>`)
    expect(diff.getUnifiedContent()).toBe(`<div>${tag}hello${mark('create', ' world')}</div>`)
    const sides = diff.getSideBySideContents()
    expect(sides[0].replace(/ data-seq="\d+"/g, '')).toBe(`<div>${tag}hello</div>`)
    expect(sides[1].replace(/ data-seq="\d+"/g, '')).toBe(
      `<div>${tag}hello${mark('create', ' world')}</div>`,
    )
  })

  it.each([
    ['<img alt="x > y" src="a.png">', 'inline', 'span'],
    ['<video title="x > y"><source src="a.mp4"></video>', 'block', 'div'],
  ])('keeps the existing media wrapper for %s', (html, kind, wrapper) => {
    for (const type of ['create', 'delete'] as const) {
      const diff = new HtmlDiff(type === 'create' ? '' : html, type === 'create' ? html : '')
      const changed = `<${wrapper} class="html-diff-${type}-${kind}-wrapper">${html}</${wrapper}>`
      expect(diff.getUnifiedContent()).toBe(changed)
      expect(diff.getSideBySideContents()).toEqual(
        type === 'create' ? ['', changed] : [changed, ''],
      )
    }
  })

  it.each(['video', 'picture'])('ignores a quoted closing %s tag when tokenizing media', name => {
    const html = `<${name} title="x > </${name}> y"><source src="a"></${name}>`
    const diff = new HtmlDiff('', html)
    const changed = name === 'video'
      ? `<div class="html-diff-create-block-wrapper">${html}</div>`
      : html
    expect(diff.getUnifiedContent()).toBe(changed)
    expect(diff.getSideBySideContents()).toEqual(['', changed])
  })

  it.each([
    ['<img alt="x > y" src="a.png">', '<img alt="x > z" src="b.png">', 'inline', 'span'],
    ['<video title="x > y"><source src="a.mp4"></video>', '<video title="x > z"><source src="b.mp4"></video>', 'block', 'div'],
  ])('preserves complete media replacements on each side for %s', (oldHtml, newHtml, kind, wrapper) => {
    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getSideBySideContents()).toEqual([
      `<${wrapper} class="html-diff-delete-${kind}-wrapper">${oldHtml}</${wrapper}>`,
      `<${wrapper} class="html-diff-create-${kind}-wrapper">${newHtml}</${wrapper}>`,
    ])
  })
})
