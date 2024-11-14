import clsx from 'clsx'
import { useState } from 'react'
import SideBySide from './components/SideBySide.jsx'
import useDiffData from './hooks/useDiffData.js'
import useInputData from './hooks/useInputData.js'

function App() {
  const [tab, setTab] = useState(1)
  const { oldHtml, updateOldHtml, newHtml, updateNewHtml } = useInputData()
  const { unifiedContent, sideBySideContents } = useDiffData({ oldHtml, newHtml })

  return (
    <div className="container-yellow h-[100vh] py-4">
      <div className="mx-auto max-w-[1280px] h-full">
        <div className="border rounded-lg flex bg-white p-4">
          <textarea
            className="textarea h-36 w-full"
            value={oldHtml}
            onChange={e => updateOldHtml(e.target.value)}
          ></textarea>
          <textarea
            className="textarea h-36 w-full ml-4"
            value={newHtml}
            onChange={e => updateNewHtml(e.target.value)}
          ></textarea>
        </div>

        <div className="border overflow-hidden mt-4 rounded-lg bg-white p-4 h-[calc(100%-194px)]">
          <div
            role="tablist"
            className="tabs tabs-lifted"
          >
            <a
              role="tab"
              className={clsx('tab', { 'tab-active': tab === 1 })}
              onClick={() => {
                setTab(1)
              }}
            >
              getUnifiedContent
            </a>
            <a
              role="tab"
              className={clsx('tab', { 'tab-active': tab === 2 })}
              onClick={() => {
                setTab(2)
              }}
            >
              getSideBySideContents
            </a>
          </div>

          {tab === 1 ? (
            <div className="overflow-auto w-[calc(50%-16px)] h-[calc(100%-32px)]">
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: unifiedContent }}
              />
            </div>
          ) : (
            <SideBySide sideBySideContents={sideBySideContents} />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
