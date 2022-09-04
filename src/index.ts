export interface MatchedBlock {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  size: number;
}

export interface Operation {
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  type: 'equal' | 'delete' | 'create' | 'replace';
}

import { dressUpDiffContent, htmlTagReg, htmlImgTagReg, htmlVideoTagReg } from './dress-up'
import { logger } from './utils'

const htmlStartTagReg = /^<(?<name>[^\s/>]+)[^>]*>$/
const htmlTagWithNameReg = /^<(?<isEnd>\/)?(?<name>[^\s>]+)[^>]*>$/

export default class HtmlDiff {
  minMatchedSize: number
  readonly oldWords: string[] = []
  readonly newWords: string[] = []
  readonly matchedBlockList: MatchedBlock[] = []
  readonly operationList: Operation[] = []

  unifiedContent?: string
  sideBySideContents?: string[]

  constructor(oldHtml: string, newHtml: string, minMatchedSize = 2) {
    this.minMatchedSize = minMatchedSize

    if (oldHtml === newHtml) {
      this.unifiedContent = oldHtml
      this.sideBySideContents = [oldHtml, newHtml]
      return
    }

    logger('↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓')

    logger('step1: split HTML to atomic words')
    this.oldWords = this.convertHtml2Words(oldHtml)
    this.newWords = this.convertHtml2Words(newHtml)

    logger('step2: find matched blocks')
    this.matchedBlockList = this.getMatchedBlockList()

    logger('step3: generate operation list')
    this.operationList = this.getOperationList()

    logger('↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑')
  }

  /**
   * convert HTML to word list
   * "<a> Hello World </a>"
   * ["<a>"," ", "Hello", " ", "World", " ", "</a>"]
   */
  private convertHtml2Words(html: string): string[] {
    // atomic word: html tag、continuous numbers or letters、blank space、symbol or other word such as Chinese
    return html.match(
      /<video[^>]*>.*?<\/video>|<[^>]+>|\w+\b|\s+|[^<>\w]/msg,
    ) || []
  }

  private getMatchedBlockList(
    oldStart = 0,
    oldEnd: number = this.oldWords.length,
    newStart = 0,
    newEnd: number = this.newWords.length,
    matchedBlockList: MatchedBlock[] = [],
  ): MatchedBlock[] {
    const matchBlock = this.getBestMatchedBlock(oldStart, oldEnd, newStart, newEnd)
    if (!matchBlock) {
      return []
    }

    if (oldStart < matchBlock.oldStart && newStart < matchBlock.newStart) {
      this.getMatchedBlockList(oldStart, matchBlock.oldStart, newStart, matchBlock.newStart, matchedBlockList)
    }
    matchedBlockList.push(matchBlock)
    if (oldEnd > matchBlock.oldEnd && newEnd > matchBlock.newEnd) {
      this.getMatchedBlockList(matchBlock.oldEnd, oldEnd, matchBlock.newEnd, newEnd, matchedBlockList)
    }
    return matchedBlockList
  }

  // find the longest matched block between old and new words
  private getBestMatchedBlock(oldStart: number, oldEnd: number, newStart: number, newEnd: number): MatchedBlock | null {
    let bestMatchedBlock = null
    for (let i = oldStart; i < oldEnd; i++) {
      const ret = this.slideBestMatchedBlock(i, newStart, Math.min(oldEnd - i, newEnd - newStart))
      if (ret && ret.size > (bestMatchedBlock?.size || 0)) {
        bestMatchedBlock = ret
      }
    }
    for (let j = newStart; j < newEnd; j++) {
      const ret = this.slideBestMatchedBlock(oldStart, j, Math.min(oldEnd - oldStart, newEnd - j))
      if (ret && ret.size > (bestMatchedBlock?.size || 0)) {
        bestMatchedBlock = ret
      }
    }
    return bestMatchedBlock
  }

  private slideBestMatchedBlock(addA: number, addB: number, len: number): MatchedBlock | null {
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

    return maxSize >= this.minMatchedSize ? bestMatchedBlock : null
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

  public getUnifiedContent(): string {
    if (this.unifiedContent !== undefined) {
      return this.unifiedContent
    }

    let result = ''
    this.operationList.forEach((operation) => {
      switch (operation.type) {
      case 'equal':
        for (const word of this.newWords.slice(operation.newStart, operation.newEnd)) {
          result += word
        }
        break
      case 'delete':
        result += dressUpDiffContent('delete', this.oldWords.slice(operation.oldStart, operation.oldEnd))
        break
      case 'create':
        result += dressUpDiffContent('create', this.newWords.slice(operation.newStart, operation.newEnd))
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
        if (olds.length === 1 && news.length === 1 && olds[0].match(htmlTagReg) && news[0].match(htmlTagReg)) {
          result += news[0]
          break
        }

        const deleteOfWords = []
        const createOfWords = []
        let createIndex = operation.newStart
        for (let deleteIndex = operation.oldStart; deleteIndex < operation.oldEnd; deleteIndex++) {
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
            result += dressUpDiffContent('delete', deleteOfWords)
            deleteOfWords.splice(0)
            let isTagInNewFind = false
            for (let tempCreateIndex = createIndex; tempCreateIndex < operation.newEnd; tempCreateIndex++) {
              const createWord = this.newWords[tempCreateIndex]
              const matchTagResultC = createWord.match(htmlTagWithNameReg)
              if (matchTagResultC
                && matchTagResultC.groups!.name === matchTagResultD.groups!.name
                && matchTagResultC.groups!.isEnd === matchTagResultD.groups!.isEnd) {
                // find first matched tag, but not maybe the expected tag(to optimize)
                isTagInNewFind = true
                result += dressUpDiffContent('create', createOfWords)
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
        result += dressUpDiffContent('delete', deleteOfWords)
        result += dressUpDiffContent('create', createOfWords)
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
    this.operationList.forEach((operation) => {
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
        oldHtml += dressUpDiffContent('delete', deleteWords)
        break
      case 'create':
        const createWords = this.newWords.slice(operation.newStart, operation.newEnd)
        newHtml += dressUpDiffContent('create', createWords)
        break
      case 'replace':
        const deleteOfReplaceWords = this.oldWords.slice(operation.oldStart, operation.oldEnd)
        oldHtml += dressUpDiffContent('delete', deleteOfReplaceWords)
        const createOfReplaceWords = this.newWords.slice(operation.newStart, operation.newEnd)
        newHtml += dressUpDiffContent('create', createOfReplaceWords)
        break
      default:
        const exhaustiveCheck: never = operation.type
        console.error('Error operation type: ' + exhaustiveCheck)
      }
    })

    const result = [oldHtml, newHtml]
    this.sideBySideContents = result
    return result
  }
}
