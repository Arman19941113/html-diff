type Operation = 'delete' | 'create';

export const htmlTagReg = /^<[^>]+>/
export const htmlImgTagReg = /^<img[^>]*>$/
export const htmlVideoTagReg = /^<video[^>]*>.*?<\/video>$/ms

export const createTextClass = 'html-diff-create-text-wrapper'
export const deleteTextClass = 'html-diff-delete-text-wrapper'
export const createBlockClass = 'html-diff-create-block-wrapper'
export const deleteBlockClass = 'html-diff-delete-block-wrapper'
export const createInlineClass = 'html-diff-create-inline-wrapper'
export const deleteInlineClass = 'html-diff-delete-inline-wrapper'
export const closeIcon = `<span class="html-diff-close-icon"></span>`

export function dressUpDiffContent(type: Operation, words: string[]): string {
  const wordsLength = words.length
  if (!wordsLength) {
    return ''
  }

  let result = ''
  let textStartIndex = 0
  for (let i = 0; i < wordsLength; i++) {
    const word = words[i]
    // this word is html tag
    if (word.match(htmlTagReg)) {
      // deal text words before
      if (i > textStartIndex) {
        result += dressUpText(type, words.slice(textStartIndex, i))
      }
      // deal this tag
      textStartIndex = i + 1
      if (word.match(htmlVideoTagReg)) {
        result += dressUpBlockTag(type, word)
      } else if ([htmlImgTagReg].some((item) => word.match(item))) {
        result += dressUpInlineTag(type, word)
      } else {
        result += word
      }
    }
  }
  if (textStartIndex < wordsLength) {
    result += dressUpText(type, words.slice(textStartIndex))
  }
  return result
}

function dressUpText(type: Operation, words: string[]): string {
  const text = words.join('')
  if (!text.trim()) return ''
  if (type === 'create') return `<span class="${createTextClass}">${text}</span>`
  if (type === 'delete') return `<span class="${deleteTextClass}">${text}</span>`
  return ''
}

function dressUpInlineTag(type: Operation, word: string): string {
  if (type === 'create') return `<span class="${createInlineClass}">${word}</span>`
  if (type === 'delete') return `<span class="${deleteInlineClass}">${word}${closeIcon}</span>`
  return ''
}

function dressUpBlockTag(type: Operation, word: string): string {
  if (type === 'create') return `<div class="${createBlockClass}">${word}</div>`
  if (type === 'delete') return `<div class="${deleteBlockClass}">${word}${closeIcon}</div>`
  return ''
}
