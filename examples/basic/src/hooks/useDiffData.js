import HtmlDiff from '@armantang/html-diff'
import { useEffect, useState } from 'react'

export default function useDiffData({ oldHtml, newHtml }) {
  const [unifiedContent, setUnifiedContent] = useState('')
  const [sideBySideContents, setSideBySideContents] = useState(['', ''])

  useEffect(() => {
    const diff = new HtmlDiff(oldHtml, newHtml, 3)
    setUnifiedContent(diff.getUnifiedContent())
    setSideBySideContents(diff.getSideBySideContents())
  }, [oldHtml, newHtml])

  return {
    unifiedContent,
    sideBySideContents,
  }
}
