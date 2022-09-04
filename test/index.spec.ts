import HtmlDiff from '../src'

describe('HtmlDiff', () => {
  it('should work with basic replace', function () {
    const oldHtml = `<div>hello</div>`
    const newHtml = `<div>world</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)

    const unifiedDiff = diff.getUnifiedContent()
    expect(unifiedDiff).toBe(`<div><span class="html-diff-delete-text-wrapper">hello</span><span class="html-diff-create-text-wrapper">world</span></div>`)

    const sideBySideDiff = diff.getSideBySideContents()
    expect(sideBySideDiff[0]).toBe(`<div><span class="html-diff-delete-text-wrapper">hello</span></div>`)
    expect(sideBySideDiff[1]).toBe(`<div><span class="html-diff-create-text-wrapper">world</span></div>`)
  })

  it('should work with basic create', function () {
    const oldHtml = `<div>hello</div>`
    const newHtml = `<div>hello world</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)

    const unifiedDiff = diff.getUnifiedContent()
    expect(unifiedDiff).toBe(`<div>hello<span class="html-diff-create-text-wrapper"> world</span></div>`)

    const sideBySideDiff = diff.getSideBySideContents()
    expect(sideBySideDiff[0]).toBe(`<div data-seq="1">hello</div>`)
    expect(sideBySideDiff[1]).toBe(`<div data-seq="1">hello<span class="html-diff-create-text-wrapper"> world</span></div>`)
  })

  it('should work with basic delete', function () {
    const oldHtml = `<div>hello world</div>`
    const newHtml = `<div>hello</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)

    const unifiedDiff = diff.getUnifiedContent()
    expect(unifiedDiff).toBe(`<div>hello<span class="html-diff-delete-text-wrapper"> world</span></div>`)

    const sideBySideDiff = diff.getSideBySideContents()
    expect(sideBySideDiff[0]).toBe(`<div data-seq="1">hello<span class="html-diff-delete-text-wrapper"> world</span></div>`)
    expect(sideBySideDiff[1]).toBe(`<div data-seq="1">hello</div>`)
  })

  it('should work sample 1', function () {
    const oldHtml = `<div>hello world</div>`
    const newHtml = `<h1>You got a dream. You gotta protect it.</h1>`
    const diff = new HtmlDiff(oldHtml, newHtml)

    const unifiedDiff = diff.getUnifiedContent()
    expect(unifiedDiff).toBe(`<div><span class="html-diff-delete-text-wrapper">hello world</span></div><h1><span class="html-diff-create-text-wrapper">You got a dream. You gotta protect it.</span></h1>`)

    const sideBySideDiff = diff.getSideBySideContents()
    expect(sideBySideDiff[0]).toBe(`<div><span class="html-diff-delete-text-wrapper">hello world</span></div>`)
    expect(sideBySideDiff[1]).toBe(`<h1><span class="html-diff-create-text-wrapper">You got a dream. You gotta protect it.</span></h1>`)
  })

  it('should work sample 2', function () {
    const oldHtml = `<h1>Hello</h1><h2>Let life be beautiful like summer flower and death like autumn leaves.</h2><p>She could fade and wither- I didn't care. I would still go mad with tenderness at the mere sight of her face.</p><p>她可以褪色，可以枯萎，怎样都可以。但只要我看她一眼，万般柔情便涌上心头。</p><p>夜已深 我心思思 你的丰姿</p><p>只想你便是 我的天使</p><p>未见半秒 便控制不了</p><p>难以心安 于今晚</p><img src="./dog.jpg" alt="dog"><h2>Try video</h2><video style="width: 100%;" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video>`
    const newHtml = `<h1>Hello World</h1><p>She could fade and wither. I would still go mad with tenderness at the mere sight of her face.</p><p>她可以褪色，可以枯萎。但只要我看她一眼，万般柔情便涌上了我的心头。</p><p>让我靠着你的臂胳</p><p>流露我热爱心底说话</p><p>孕育美丽温馨爱意</p><p>做梦 都是你</p><img src="./cat.jpg" alt="cat"><h2>Try video</h2><h2>Set the bird's wings with gold and it will never again soar in the sky.</h2><video style="width: 100%;" controls src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video>`
    const diff = new HtmlDiff(oldHtml, newHtml, 3)

    const unifiedDiff = diff.getUnifiedContent()
    console.log(unifiedDiff)
    const sideBySideDiff = diff.getSideBySideContents()
    console.log(sideBySideDiff)
    expect(unifiedDiff).toBe(`<h1><span class="html-diff-delete-text-wrapper">Hello</span><span class="html-diff-create-text-wrapper">Hello World</span></h1><h2><span class="html-diff-delete-text-wrapper">Let life be beautiful like summer flower and death like autumn leaves.</span></h2><p>She could fade and wither<span class="html-diff-delete-text-wrapper">- I didn't care</span>. I would still go mad with tenderness at the mere sight of her face.</p><p>她可以褪色，可以枯萎<span class="html-diff-delete-text-wrapper">，怎样都可以</span>。但只要我看她一眼，万般柔情便涌上<span class="html-diff-create-text-wrapper">了我的</span>心头。</p><p><span class="html-diff-delete-text-wrapper">夜已深 我心思思 你的丰姿</span><span class="html-diff-create-text-wrapper">让我靠着你的臂胳</span></p><p><span class="html-diff-delete-text-wrapper">只想你便是 我的天使</span><span class="html-diff-create-text-wrapper">流露我热爱心底说话</span></p><p><span class="html-diff-delete-text-wrapper">未见半秒 便控制不了</span><span class="html-diff-create-text-wrapper">孕育美丽温馨爱意</span></p><p><span class="html-diff-delete-text-wrapper">难以心安 于今晚</span><span class="html-diff-create-text-wrapper">做梦 都是你</span></p><span class="html-diff-delete-inline-wrapper"><img src="./dog.jpg" alt="dog"><span class="html-diff-close-icon"></span></span><span class="html-diff-create-inline-wrapper"><img src="./cat.jpg" alt="cat"></span><h2>Try video</h2><div class="html-diff-delete-block-wrapper"><video style="width: 100%;" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video><span class="html-diff-close-icon"></span></div><h2><span class="html-diff-create-text-wrapper">Set the bird's wings with gold and it will never again soar in the sky.</span></h2><div class="html-diff-create-block-wrapper"><video style="width: 100%;" controls src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video></div>`)

    expect(sideBySideDiff[0]).toBe(`<h1><span class="html-diff-delete-text-wrapper">Hello</span></h1><h2><span class="html-diff-delete-text-wrapper">Let life be beautiful like summer flower and death like autumn leaves.</span></h2><p data-seq="1">She could fade and wither<span class="html-diff-delete-text-wrapper">- I didn't care</span>. I would still go mad with tenderness at the mere sight of her face.</p><p data-seq="2">她可以褪色，可以枯萎<span class="html-diff-delete-text-wrapper">，怎样都可以</span>。但只要我看她一眼，万般柔情便涌上心头。</p><p data-seq="3"><span class="html-diff-delete-text-wrapper">夜已深 我心思思 你的丰姿</span></p><p><span class="html-diff-delete-text-wrapper">只想你便是 我的天使</span></p><p><span class="html-diff-delete-text-wrapper">未见半秒 便控制不了</span></p><p><span class="html-diff-delete-text-wrapper">难以心安 于今晚</span></p><span class="html-diff-delete-inline-wrapper"><img src="./dog.jpg" alt="dog"><span class="html-diff-close-icon"></span></span><h2 data-seq="4">Try video</h2><div class="html-diff-delete-block-wrapper"><video style="width: 100%;" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video><span class="html-diff-close-icon"></span></div>`)
    expect(sideBySideDiff[1]).toBe(`<h1><span class="html-diff-create-text-wrapper">Hello World</span></h1><p data-seq="1">She could fade and wither. I would still go mad with tenderness at the mere sight of her face.</p><p data-seq="2">她可以褪色，可以枯萎。但只要我看她一眼，万般柔情便涌上<span class="html-diff-create-text-wrapper">了我的</span>心头。</p><p data-seq="3"><span class="html-diff-create-text-wrapper">让我靠着你的臂胳</span></p><p><span class="html-diff-create-text-wrapper">流露我热爱心底说话</span></p><p><span class="html-diff-create-text-wrapper">孕育美丽温馨爱意</span></p><p><span class="html-diff-create-text-wrapper">做梦 都是你</span></p><span class="html-diff-create-inline-wrapper"><img src="./cat.jpg" alt="cat"></span><h2 data-seq="4">Try video</h2><h2><span class="html-diff-create-text-wrapper">Set the bird's wings with gold and it will never again soar in the sky.</span></h2><div class="html-diff-create-block-wrapper"><video style="width: 100%;" controls src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video></div>`)
  })
})
