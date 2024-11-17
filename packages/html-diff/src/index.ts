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
  greedyMatch: boolean
  greedyBoundary: number
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
  /**
   * Determine the minimum threshold for calculating common sub-tokens.
   * You may adjust it to a value larger than 2, but not lower, due to the potential inclusion of HTML tags in the count.
   * @defaultValue 2
   */
  minMatchedSize?: number
  /**
   * When greedyMatch is enabled, if the length of the sub-tokens exceeds greedyBoundary,
   * we will use the matched sub-tokens that are sufficiently good, even if they are not optimal, to enhance performance.
   * @defaultValue true
   */
  greedyMatch?: boolean
  /**
   * @defaultValue 1000
   */
  greedyBoundary?: number
  /**
   * The classNames for wrapper DOM.
   * Use this to configure your own styles without importing the built-in CSS file
   */
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
  private readonly oldTokens: string[] = []
  private readonly newTokens: string[] = []
  private readonly matchedBlockList: MatchedBlock[] = []
  private readonly operationList: Operation[] = []
  private leastCommonLength: number = Infinity
  private unifiedContent?: string
  private sideBySideContents?: [string, string]

  constructor(
    oldHtml: string,
    newHtml: string,
    {
      minMatchedSize = 2,
      greedyMatch = true,
      greedyBoundary = 1000,
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
      greedyMatch,
      greedyBoundary,
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

    // step1: split HTML to tokens(atomic tokens)
    this.oldTokens = this.tokenize(oldHtml)
    this.newTokens = this.tokenize(newHtml)
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
          for (const token of this.newTokens.slice(
            operation.newStart,
            operation.newEnd,
          )) {
            result += token
          }
          break
        case 'delete':
          result += this.dressUpDiffContent(
            'delete',
            this.oldTokens.slice(operation.oldStart, operation.oldEnd),
          )
          break
        case 'create':
          result += this.dressUpDiffContent(
            'create',
            this.newTokens.slice(operation.newStart, operation.newEnd),
          )
          break
        case 'replace':
          // handle specially tag replace
          const olds = this.oldTokens.slice(operation.oldStart, operation.oldEnd)
          const news = this.newTokens.slice(operation.newStart, operation.newEnd)
          if (
            olds.length === 1 &&
            news.length === 1 &&
            olds[0].match(htmlTagReg) &&
            news[0].match(htmlTagReg)
          ) {
            result += news[0]
            break
          }

          const deletedTokens = []
          const createdTokens = []
          let createIndex = operation.newStart
          for (
            let deleteIndex = operation.oldStart;
            deleteIndex < operation.oldEnd;
            deleteIndex++
          ) {
            const deletedToken = this.oldTokens[deleteIndex]
            const matchTagResultD = deletedToken.match(htmlTagWithNameReg)
            if (matchTagResultD) {
              // handle replaced tag token

              // skip special tag
              if (
                [htmlImgTagReg, htmlVideoTagReg].some(item => deletedToken.match(item))
              ) {
                deletedTokens.push(deletedToken)
                continue
              }

              // handle normal tag
              result += this.dressUpDiffContent('delete', deletedTokens)
              deletedTokens.splice(0)
              let isTagInNewFind = false
              for (
                let tempCreateIndex = createIndex;
                tempCreateIndex < operation.newEnd;
                tempCreateIndex++
              ) {
                const createdToken = this.newTokens[tempCreateIndex]
                const matchTagResultC = createdToken.match(htmlTagWithNameReg)
                if (
                  matchTagResultC &&
                  matchTagResultC.groups!.name === matchTagResultD.groups!.name &&
                  matchTagResultC.groups!.isEnd === matchTagResultD.groups!.isEnd
                ) {
                  // find first matched tag, but not maybe the expected tag(to optimize)
                  isTagInNewFind = true
                  result += this.dressUpDiffContent('create', createdTokens)
                  result += createdToken
                  createdTokens.splice(0)
                  createIndex = tempCreateIndex + 1
                  break
                } else {
                  createdTokens.push(createdToken)
                }
              }
              if (!isTagInNewFind) {
                result += deletedToken
                createdTokens.splice(0)
              }
            } else {
              // token is not a tag
              deletedTokens.push(deletedToken)
            }
          }
          if (createIndex < operation.newEnd) {
            createdTokens.push(...this.newTokens.slice(createIndex, operation.newEnd))
          }
          result += this.dressUpDiffContent('delete', deletedTokens)
          result += this.dressUpDiffContent('create', createdTokens)
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
          const equalTokens = this.newTokens.slice(operation.newStart, operation.newEnd)
          let equalString = ''
          for (const token of equalTokens) {
            // find start tags and add data-seq to enable sync scroll
            const startTagMatch = token.match(htmlStartTagReg)
            if (startTagMatch) {
              equalSequence += 1
              const tagNameLength = startTagMatch.groups!.name.length + 1
              equalString += `${token.slice(0, tagNameLength)} data-seq="${equalSequence}"${token.slice(tagNameLength)}`
            } else {
              equalString += token
            }
          }
          oldHtml += equalString
          newHtml += equalString
          break
        case 'delete':
          const deletedTokens = this.oldTokens.slice(operation.oldStart, operation.oldEnd)
          oldHtml += this.dressUpDiffContent('delete', deletedTokens)
          break
        case 'create':
          newHtml += this.dressUpDiffContent(
            'create',
            this.newTokens.slice(operation.newStart, operation.newEnd),
          )
          break
        case 'replace':
          oldHtml += this.dressUpDiffContent(
            'delete',
            this.oldTokens.slice(operation.oldStart, operation.oldEnd),
          )
          newHtml += this.dressUpDiffContent(
            'create',
            this.newTokens.slice(operation.newStart, operation.newEnd),
          )
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
   * convert HTML to tokens
   * @example
   * tokenize("<a> Hello World </a>")
   * ["<a>"," ", "Hello", " ", "World", " ", "</a>"]
   */
  private tokenize(html: string): string[] {
    // atomic token: html tag、continuous numbers or letters、blank spaces、other symbol
    return (
      html.match(
        /<picture[^>]*>.*?<\/picture>|<video[^>]*>.*?<\/video>|<[^>]+>|\w+\b|\s+|[^<>\w]/gms,
      ) || []
    )
  }

  private getMatchedBlockList(): MatchedBlock[] {
    const n1 = this.oldTokens.length
    const n2 = this.newTokens.length

    // 1. sync from start
    let start: MatchedBlock | null = null
    let i = 0
    while (i < n1 && i < n2 && this.oldTokens[i] === this.newTokens[i]) {
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
    while (i <= e1 && i <= e2 && this.oldTokens[e1] === this.newTokens[e2]) {
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

    // 3. handle rest
    const oldStart = start ? i : 0
    const oldEnd = end ? e1 + 1 : n1
    const newStart = start ? i : 0
    const newEnd = end ? e2 + 1 : n2
    // optimize for large tokens
    if (this.config.greedyMatch) {
      const commonLength = Math.min(oldEnd - oldStart, newEnd - newStart)
      if (commonLength > this.config.greedyBoundary) {
        this.leastCommonLength = Math.floor(commonLength / 3)
      }
    }
    const ret = this.computeMatchedBlockList(oldStart, oldEnd, newStart, newEnd)
    if (start) ret.unshift(start)
    if (end) ret.push(end)

    return ret
  }

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

  // Find the longest matched block between tokens
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
        if (ret.size > this.leastCommonLength) return bestMatchedBlock
      }
    }
    for (let j = newStart; j < newEnd; j++) {
      const len = Math.min(oldEnd - oldStart, newEnd - j)
      const ret = this.slideBestMatchedBlock(oldStart, j, len)
      if (ret && (!bestMatchedBlock || ret.size > bestMatchedBlock.size)) {
        bestMatchedBlock = ret
        if (ret.size > this.leastCommonLength) return bestMatchedBlock
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
      if (this.oldTokens[addA + i] === this.newTokens[addB + i]) {
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

  // Generate operation list by matchedBlockList
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
    // handle the tail content
    const maxIndexOld = this.oldTokens.length
    const maxIndexNew = this.newTokens.length
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

  private dressUpDiffContent(type: BaseOpType, tokens: string[]): string {
    const tokensLength = tokens.length
    if (!tokensLength) {
      return ''
    }

    let result = ''
    let textStartIndex = 0
    for (let i = 0; i < tokensLength; i++) {
      const token = tokens[i]
      // this token is html tag
      if (token.match(htmlTagReg)) {
        // handle text tokens before
        if (i > textStartIndex) {
          result += this.dressUpText(type, tokens.slice(textStartIndex, i))
        }
        // handle this tag
        textStartIndex = i + 1
        if (token.match(htmlVideoTagReg)) {
          result += this.dressUpBlockTag(type, token)
        } else if ([htmlImgTagReg].some(item => token.match(item))) {
          result += this.dressUpInlineTag(type, token)
        } else {
          result += token
        }
      }
    }
    if (textStartIndex < tokensLength) {
      result += this.dressUpText(type, tokens.slice(textStartIndex))
    }
    return result
  }

  private dressUpText(type: BaseOpType, tokens: string[]): string {
    const text = tokens.join('')
    if (!text.trim()) return ''
    if (type === 'create')
      return `<span class="${this.config.classNames.createText}">${text}</span>`
    if (type === 'delete')
      return `<span class="${this.config.classNames.deleteText}">${text}</span>`
    return ''
  }

  private dressUpInlineTag(type: BaseOpType, token: string): string {
    if (type === 'create')
      return `<span class="${this.config.classNames.createInline}">${token}</span>`
    if (type === 'delete')
      return `<span class="${this.config.classNames.deleteInline}">${token}</span>`
    return ''
  }

  private dressUpBlockTag(type: BaseOpType, token: string): string {
    if (type === 'create')
      return `<div class="${this.config.classNames.createBlock}">${token}</div>`
    if (type === 'delete')
      return `<div class="${this.config.classNames.deleteBlock}">${token}</div>`
    return ''
  }
}
