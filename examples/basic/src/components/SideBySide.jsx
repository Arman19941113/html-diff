import { useEffect, useRef } from 'react'

export default function SideBySide({ sideBySideContents }) {
  const baseTop = useRef(0)
  useEffect(() => {
    baseTop.current = leftContainer.current.getBoundingClientRect().top
  }, [])

  const leftContainer = useRef(null)
  const rightContainer = useRef(null)
  useEffect(() => {
    let timer = null
    let isLeftScroll = false
    let isRightScroll = false
    function handleScroll(type) {
      if (type === 'left') {
        if (isRightScroll) return
        isLeftScroll = true
        clearTimeout(timer)
        timer = setTimeout(() => {
          isLeftScroll = false
        }, 300)
        syncScroll(leftContainer.current, rightContainer.current)
      } else {
        if (isLeftScroll) return
        isRightScroll = true
        clearTimeout(timer)
        timer = setTimeout(() => {
          isRightScroll = false
        }, 300)
        syncScroll(rightContainer.current, leftContainer.current)
      }
    }
    function syncScroll(origin, target) {
      let findSeq = ''
      let leftTop = 0
      for (const el of origin.children) {
        if (el.dataset.seq && el.getBoundingClientRect().top > baseTop.current) {
          findSeq = el.dataset.seq
          leftTop = el.getBoundingClientRect().top
          break
        }
      }
      if (!findSeq) return

      let syncEl = null
      for (const el of target.children) {
        if (el.dataset.seq === findSeq) {
          syncEl = el
          break
        }
      }
      if (!syncEl) return

      const rightTop = syncEl.getBoundingClientRect().top
      const delta = rightTop - leftTop
      target.scrollTo({ top: target.scrollTop + delta })
    }

    const handleLeftScroll = () => handleScroll('left')
    const handleRightScroll = () => handleScroll('right')
    leftContainer.current.addEventListener('scroll', handleLeftScroll)
    rightContainer.current.addEventListener('scroll', handleRightScroll)

    return () => {
      clearTimeout(timer)
      leftContainer.current.removeEventListener('scroll', handleLeftScroll)
      rightContainer.current.removeEventListener('scroll', handleRightScroll)
    }
  }, [])

  return (
    <div className="flex h-[calc(100%-32px)]">
      <div
        ref={leftContainer}
        className="markdown-body overflow-auto h-full w-1/2"
        dangerouslySetInnerHTML={{ __html: sideBySideContents[0] }}
      />
      <div className="w-2"></div>
      <div
        ref={rightContainer}
        className="markdown-body overflow-auto h-full w-1/2"
        dangerouslySetInnerHTML={{ __html: sideBySideContents[1] }}
      />
    </div>
  )
}
