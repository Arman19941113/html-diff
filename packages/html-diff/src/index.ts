interface MatchedBlock {
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
  size: number
}

interface Operation {
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
  type: 'equal' | 'delete' | 'create' | 'replace'
}

type BaseOpType = 'delete' | 'create'

interface HtmlDiffConfig {
  minMatchedSize: number
  classNames: {
    createText: string
    deleteText: string
    createInline: string
    deleteInline: string
    createBlock: string
    deleteBlock: string
  }
}

export interface HtmlDiffOptions {
  minMatchedSize?: number
  classNames?: Partial<{
    createText?: string
    deleteText?: string
    createInline?: string
    deleteInline?: string
    createBlock?: string
    deleteBlock?: string
  }>
}

const htmlStartTagReg = /^<(?<name>[^\s/>]+)[^>]*>$/
const htmlTagWithNameReg = /^<(?<isEnd>\/)?(?<name>[^\s>]+)[^>]*>$/

const htmlTagReg = /^<[^>]+>/
const htmlImgTagReg = /^<img[^>]*>$/
const htmlVideoTagReg = /^<video[^>]*>.*?<\/video>$/ms

export default class HtmlDiff {
  private readonly config: HtmlDiffConfig
  private readonly oldWords: string[] = []
  private readonly newWords: string[] = []
  private readonly matchedBlockList: MatchedBlock[] = []
  private readonly operationList: Operation[] = []
  private unifiedContent?: string
  private sideBySideContents?: [string, string]

  constructor(
    oldHtml: string,
    newHtml: string,
    {
      minMatchedSize = 2,
      classNames = {
        createText: 'html-diff-create-text-wrapper',
        deleteText: 'html-diff-delete-text-wrapper',
        createInline: 'html-diff-create-inline-wrapper',
        deleteInline: 'html-diff-delete-inline-wrapper',
        createBlock: 'html-diff-create-block-wrapper',
        deleteBlock: 'html-diff-delete-block-wrapper',
      },
    }: HtmlDiffOptions = {},
  ) {
    // init config
    this.config = {
      minMatchedSize,
      classNames: {
        createText: 'html-diff-create-text-wrapper',
        deleteText: 'html-diff-delete-text-wrapper',
        createInline: 'html-diff-create-inline-wrapper',
        deleteInline: 'html-diff-delete-inline-wrapper',
        createBlock: 'html-diff-create-block-wrapper',
        deleteBlock: 'html-diff-delete-block-wrapper',
        ...classNames,
      },
    }

    // no need to diff
    if (oldHtml === newHtml) {
      this.unifiedContent = oldHtml
      this.sideBySideContents = [oldHtml, newHtml]
      return
    }

    // step1: split HTML to atomic words
    this.oldWords = this.convertHtml2Words(oldHtml)
    this.newWords = this.convertHtml2Words(newHtml)
    // step2: find matched blocks
    this.matchedBlockList = this.getMatchedBlockList()
    // step3: generate operation list
    this.operationList = this.getOperationList()
  }

  public getUnifiedContent(): string {
    if (this.unifiedContent !== undefined) {
      return this.unifiedContent
    }

    let result = ''
    this.operationList.forEach(operation => {
      switch (operation.type) {
        case 'equal':
          for (const word of this.newWords.slice(operation.newStart, operation.newEnd)) {
            result += word
          }
          break
        case 'delete':
          result += this.dressUpDiffContent(
            'delete',
            this.oldWords.slice(operation.oldStart, operation.oldEnd),
          )
          break
        case 'create':
          result += this.dressUpDiffContent(
            'create',
            this.newWords.slice(operation.newStart, operation.newEnd),
          )
          break
        case 'replace':
          // should handle the duplicated tags(to optimize): find the same tag name and reserve one
          // delete: <p>dd
          // create: <p>ff</p><p>haha
          // expected: <p><span class>dd</span><span class>ff</span></p><p>haha
          // delete: <p>dd</p><p>滴
          // create: <p>ff</p><p>haha
          // expected: <p><span class>dd</span><span class>ff</span></p>ha<p>

          // deal specially tag replace
          const olds = this.oldWords.slice(operation.oldStart, operation.oldEnd)
          const news = this.newWords.slice(operation.newStart, operation.newEnd)
          if (
            olds.length === 1 &&
            news.length === 1 &&
            olds[0].match(htmlTagReg) &&
            news[0].match(htmlTagReg)
          ) {
            result += news[0]
            break
          }

          const deleteOfWords = []
          const createOfWords = []
          let createIndex = operation.newStart
          for (
            let deleteIndex = operation.oldStart;
            deleteIndex < operation.oldEnd;
            deleteIndex++
          ) {
            const deleteWord = this.oldWords[deleteIndex]
            const matchTagResultD = deleteWord.match(htmlTagWithNameReg)
            if (matchTagResultD) {
              // handle replaced tag word

              // skip special tag
              if ([htmlImgTagReg, htmlVideoTagReg].some(item => deleteWord.match(item))) {
                deleteOfWords.push(deleteWord)
                continue
              }

              // deal normal tag
              result += this.dressUpDiffContent('delete', deleteOfWords)
              deleteOfWords.splice(0)
              let isTagInNewFind = false
              for (
                let tempCreateIndex = createIndex;
                tempCreateIndex < operation.newEnd;
                tempCreateIndex++
              ) {
                const createWord = this.newWords[tempCreateIndex]
                const matchTagResultC = createWord.match(htmlTagWithNameReg)
                if (
                  matchTagResultC &&
                  matchTagResultC.groups!.name === matchTagResultD.groups!.name &&
                  matchTagResultC.groups!.isEnd === matchTagResultD.groups!.isEnd
                ) {
                  // find first matched tag, but not maybe the expected tag(to optimize)
                  isTagInNewFind = true
                  result += this.dressUpDiffContent('create', createOfWords)
                  result += createWord
                  createOfWords.splice(0)
                  createIndex = tempCreateIndex + 1
                  break
                } else {
                  createOfWords.push(createWord)
                }
              }
              if (!isTagInNewFind) {
                result += deleteWord
                createOfWords.splice(0)
              }
            } else {
              // word is not a tag
              deleteOfWords.push(deleteWord)
            }
          }
          if (createIndex < operation.newEnd) {
            createOfWords.push(...this.newWords.slice(createIndex, operation.newEnd))
          }
          result += this.dressUpDiffContent('delete', deleteOfWords)
          result += this.dressUpDiffContent('create', createOfWords)
          break
        default:
          const exhaustiveCheck: never = operation.type
          console.error('Error operation type: ' + exhaustiveCheck)
      }
    })
    this.unifiedContent = result
    return result
  }

  public getSideBySideContents(): string[] {
    if (this.sideBySideContents !== undefined) {
      return this.sideBySideContents
    }

    let oldHtml = ''
    let newHtml = ''
    let equalSequence = 0
    this.operationList.forEach(operation => {
      switch (operation.type) {
        case 'equal':
          const equalWords = this.newWords.slice(operation.newStart, operation.newEnd)
          let equalString = ''
          for (const word of equalWords) {
            // find start tags and add data-seq to enable sync scroll
            const startTagMatch = word.match(htmlStartTagReg)
            if (startTagMatch) {
              equalSequence += 1
              const tagNameLength = startTagMatch.groups!.name.length + 1
              equalString += `${word.slice(0, tagNameLength)} data-seq="${equalSequence}"${word.slice(tagNameLength)}`
            } else {
              equalString += word
            }
          }
          oldHtml += equalString
          newHtml += equalString
          break
        case 'delete':
          const deleteWords = this.oldWords.slice(operation.oldStart, operation.oldEnd)
          oldHtml += this.dressUpDiffContent('delete', deleteWords)
          break
        case 'create':
          const createWords = this.newWords.slice(operation.newStart, operation.newEnd)
          newHtml += this.dressUpDiffContent('create', createWords)
          break
        case 'replace':
          const deleteOfReplaceWords = this.oldWords.slice(
            operation.oldStart,
            operation.oldEnd,
          )
          oldHtml += this.dressUpDiffContent('delete', deleteOfReplaceWords)
          const createOfReplaceWords = this.newWords.slice(
            operation.newStart,
            operation.newEnd,
          )
          newHtml += this.dressUpDiffContent('create', createOfReplaceWords)
          break
        default:
          const exhaustiveCheck: never = operation.type
          console.error('Error operation type: ' + exhaustiveCheck)
      }
    })

    const result: [string, string] = [oldHtml, newHtml]
    this.sideBySideContents = result
    return result
  }

  /**
   * convert HTML to word list
   * "<a> Hello World </a>"
   * ["<a>"," ", "Hello", " ", "World", " ", "</a>"]
   */
  private convertHtml2Words(html: string): string[] {
    // atomic word: html tag、continuous numbers or letters、blank space、symbol or other word such as Chinese
    return (
      html.match(
        /<picture[^>]*>.*?<\/picture>|<video[^>]*>.*?<\/video>|<[^>]+>|\w+\b|\s+|[^<>\w]/gms,
      ) || []
    )
  }

  private getMatchedBlockList(): MatchedBlock[] {
    const n1 = this.oldWords.length
    const n2 = this.newWords.length

    // 1. sync from start
    let start: MatchedBlock | null = null
    let i = 0
    while (i < n1 && i < n2 && this.oldWords[i] === this.newWords[i]) {
      i++
    }
    if (i >= this.config.minMatchedSize) {
      start = {
        oldStart: 0,
        oldEnd: i,
        newStart: 0,
        newEnd: i,
        size: i,
      }
    }

    // 2. sync from end
    let end: MatchedBlock | null = null
    let e1 = n1 - 1
    let e2 = n2 - 1
    while (i <= e1 && i <= e2 && this.oldWords[e1] === this.newWords[e2]) {
      e1--
      e2--
    }
    const size = n1 - 1 - e1
    if (size >= this.config.minMatchedSize) {
      end = {
        oldStart: e1 + 1,
        oldEnd: n1,
        newStart: e2 + 1,
        newEnd: n2,
        size,
      }
    }

    const ret = this.computeMatchedBlockList(
      start ? i : 0,
      end ? e1 + 1 : n1,
      start ? i : 0,
      end ? e2 + 1 : n2,
    )
    if (start) ret.unshift(start)
    if (end) ret.push(end)

    return ret
  }

  // todo difflib
  private computeMatchedBlockList(
    oldStart: number,
    oldEnd: number,
    newStart: number,
    newEnd: number,
    matchedBlockList: MatchedBlock[] = [],
  ): MatchedBlock[] {
    const matchBlock = this.computeBestMatchedBlock(oldStart, oldEnd, newStart, newEnd)
    if (!matchBlock) {
      return []
    }

    if (oldStart < matchBlock.oldStart && newStart < matchBlock.newStart) {
      this.computeMatchedBlockList(
        oldStart,
        matchBlock.oldStart,
        newStart,
        matchBlock.newStart,
        matchedBlockList,
      )
    }
    matchedBlockList.push(matchBlock)
    if (oldEnd > matchBlock.oldEnd && newEnd > matchBlock.newEnd) {
      this.computeMatchedBlockList(
        matchBlock.oldEnd,
        oldEnd,
        matchBlock.newEnd,
        newEnd,
        matchedBlockList,
      )
    }
    return matchedBlockList
  }

  // find the longest matched block between old and new words
  // 滑动窗口 O((N+M)×min(N,M))
  private computeBestMatchedBlock(
    oldStart: number,
    oldEnd: number,
    newStart: number,
    newEnd: number,
  ): MatchedBlock | null {
    let bestMatchedBlock = null
    for (let i = oldStart; i < oldEnd; i++) {
      const len = Math.min(oldEnd - i, newEnd - newStart)
      const ret = this.slideBestMatchedBlock(i, newStart, len)
      if (ret && (!bestMatchedBlock || ret.size > bestMatchedBlock.size)) {
        bestMatchedBlock = ret
      }
    }
    for (let j = newStart; j < newEnd; j++) {
      const len = Math.min(oldEnd - oldStart, newEnd - j)
      const ret = this.slideBestMatchedBlock(oldStart, j, len)
      if (ret && (!bestMatchedBlock || ret.size > bestMatchedBlock.size)) {
        bestMatchedBlock = ret
      }
    }
    return bestMatchedBlock
  }

  private slideBestMatchedBlock(
    addA: number,
    addB: number,
    len: number,
  ): MatchedBlock | null {
    let maxSize = 0
    let bestMatchedBlock: MatchedBlock | null = null

    let continuousSize = 0
    for (let i = 0; i < len; i++) {
      if (this.oldWords[addA + i] === this.newWords[addB + i]) {
        continuousSize++
      } else {
        continuousSize = 0
      }
      if (continuousSize > maxSize) {
        maxSize = continuousSize
        bestMatchedBlock = {
          oldStart: addA + i - continuousSize + 1,
          oldEnd: addA + i + 1,
          newStart: addB + i - continuousSize + 1,
          newEnd: addB + i + 1,
          size: continuousSize,
        }
      }
    }

    return maxSize >= this.config.minMatchedSize ? bestMatchedBlock : null
  }

  // use matchedBlockList walk the words to find change description
  private getOperationList(): Operation[] {
    const operationList: Operation[] = []
    let walkIndexOld = 0
    let walkIndexNew = 0
    for (const matchedBlock of this.matchedBlockList) {
      const isOldStartIndexMatched = walkIndexOld === matchedBlock.oldStart
      const isNewStartIndexMatched = walkIndexNew === matchedBlock.newStart
      const operationBase = {
        oldStart: walkIndexOld,
        oldEnd: matchedBlock.oldStart,
        newStart: walkIndexNew,
        newEnd: matchedBlock.newStart,
      }
      if (!isOldStartIndexMatched && !isNewStartIndexMatched) {
        operationList.push(Object.assign(operationBase, { type: 'replace' as const }))
      } else if (isOldStartIndexMatched && !isNewStartIndexMatched) {
        operationList.push(Object.assign(operationBase, { type: 'create' as const }))
      } else if (!isOldStartIndexMatched && isNewStartIndexMatched) {
        operationList.push(Object.assign(operationBase, { type: 'delete' as const }))
      }

      operationList.push({
        oldStart: matchedBlock.oldStart,
        oldEnd: matchedBlock.oldEnd,
        newStart: matchedBlock.newStart,
        newEnd: matchedBlock.newEnd,
        type: 'equal',
      })
      walkIndexOld = matchedBlock.oldEnd
      walkIndexNew = matchedBlock.newEnd
    }
    // deal the tail content
    const maxIndexOld = this.oldWords.length
    const maxIndexNew = this.newWords.length
    const tailOperationBase = {
      oldStart: walkIndexOld,
      oldEnd: maxIndexOld,
      newStart: walkIndexNew,
      newEnd: maxIndexNew,
    }
    const isOldFinished = walkIndexOld === maxIndexOld
    const isNewFinished = walkIndexNew === maxIndexNew
    if (!isOldFinished && !isNewFinished) {
      operationList.push(Object.assign(tailOperationBase, { type: 'replace' as const }))
    } else if (isOldFinished && !isNewFinished) {
      operationList.push(Object.assign(tailOperationBase, { type: 'create' as const }))
    } else if (!isOldFinished && isNewFinished) {
      operationList.push(Object.assign(tailOperationBase, { type: 'delete' as const }))
    }
    return operationList
  }

  private dressUpDiffContent(type: BaseOpType, words: string[]): string {
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
          result += this.dressUpText(type, words.slice(textStartIndex, i))
        }
        // deal this tag
        textStartIndex = i + 1
        if (word.match(htmlVideoTagReg)) {
          result += this.dressUpBlockTag(type, word)
        } else if ([htmlImgTagReg].some(item => word.match(item))) {
          result += this.dressUpInlineTag(type, word)
        } else {
          result += word
        }
      }
    }
    if (textStartIndex < wordsLength) {
      result += this.dressUpText(type, words.slice(textStartIndex))
    }
    return result
  }

  private dressUpText(type: BaseOpType, words: string[]): string {
    const text = words.join('')
    if (!text.trim()) return ''
    if (type === 'create')
      return `<span class="${this.config.classNames.createText}">${text}</span>`
    if (type === 'delete')
      return `<span class="${this.config.classNames.deleteText}">${text}</span>`
    return ''
  }

  private dressUpInlineTag(type: BaseOpType, word: string): string {
    if (type === 'create')
      return `<span class="${this.config.classNames.createInline}">${word}</span>`
    if (type === 'delete')
      return `<span class="${this.config.classNames.deleteInline}">${word}</span>`
    return ''
  }

  private dressUpBlockTag(type: BaseOpType, word: string): string {
    if (type === 'create')
      return `<div class="${this.config.classNames.createBlock}">${word}</div>`
    if (type === 'delete')
      return `<div class="${this.config.classNames.deleteBlock}">${word}</div>`
    return ''
  }
}
