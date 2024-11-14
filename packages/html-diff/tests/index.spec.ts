import { describe, expect, it } from 'vitest'
import HtmlDiff from '../src'

describe('HtmlDiff', () => {
  it('should work with basic create', function () {
    const oldHtml = `<div>hello</div>`
    const newHtml = `<div>hello world</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })

  it('should work with basic delete', function () {
    const oldHtml = `<div>hello world</div>`
    const newHtml = `<div>hello</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })

  it('should work with basic replace', function () {
    const oldHtml = `<div>hello</div>`
    const newHtml = `<div>world</div>`
    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })

  it('should work sample 1', function () {
    const oldHtml = `<div>hello world</div>`
    const newHtml = `<h1>You got a dream. You gotta protect it.</h1>`
    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })

  it('should work sample 2', function () {
    const oldHtml = `<h1>Hello</h1>
<h2>Let life be beautiful like summer flower and death like autumn leaves.</h2>
<p>She could fade and wither- I didn't care. I would still go mad with tenderness at the mere sight of her face.</p>
<p>她可以褪色，可以枯萎，怎样都可以。但只要我看她一眼，万般柔情便涌上心头。</p>
<p>夜已深 我心思思 你的丰姿</p>
<p>只想你便是 我的天使</p>
<p>未见半秒 便控制不了</p>
<p>难以心安 于今晚</p>
<img src="./dog.jpg" alt="dog"><h2>Try video</h2>
<video style="width: 100%;" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video>`
    const newHtml = `<h1>Hello World</h1><p>She could fade and wither. I would still go mad with tenderness at the mere sight of her face.</p>
<p>她可以褪色，可以枯萎。但只要我看她一眼，万般柔情便涌上了我的心头。</p>
<p>让我靠着你的臂胳</p>
<p>流露我热爱心底说话</p>
<p>孕育美丽温馨爱意</p>
<p>做梦 都是你</p>
<img src="./cat.jpg" alt="cat"><h2>Try video</h2>
<h2>Set the bird's wings with gold and it will never again soar in the sky.</h2>
<video style="width: 100%;" controls src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4"></video>`

    const diff = new HtmlDiff(oldHtml, newHtml, 3)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })

  it('should work sample 3', function () {
    const oldHtml = `<h1>hello world</h1>
<p>勤字功夫，第一贵早起，第二贵有恒。</p>
<p>流水不争先，争的是滔滔不绝</p>
<p>即便再痛苦，也不要选择放弃！</p>
<p>不相信自己的人，连努力的价值都没有！</p>
<p>今天和明天已经由昨天决定，你还可以决定后天。</p>
<p>只有当你离开自己的舒适区时，你才会挑战自己的极限。</p>
<p>一本有价值的书就是一盏智慧之灯，总有人不断从中提取光明。</p>`
    const newHtml = `<h1>hello world</h1>
<p>勤字功夫，第一贵早起，第二贵有恒。</p>
<p>流水不争先，争的是滔滔不绝</p>
<p>痛苦，要选择放弃！</p>
<p>不相信自己的人，也有努力的价值！</p>
<p>无休止的欲望像个黑洞，浸染了我们原本澄澈而简单的心</p>
<p>只有当你离开自己的舒适区时，你才会挑战自己的极限。</p>
<p>一本有价值的书就是一盏智慧之灯，总有人不断从中提取光明。</p>`

    const diff = new HtmlDiff(oldHtml, newHtml)
    expect(diff.getUnifiedContent()).toMatchSnapshot()
    expect(diff.getSideBySideContents()).toMatchSnapshot()
  })
})
