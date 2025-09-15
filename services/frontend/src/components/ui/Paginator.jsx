import React, { useEffect, useState } from 'react'
// @ts-ignore - CSS modules are declared globally
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, PlatformaticIcon } from '@platformatic/ui-components'
import { TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'

function Paginator ({
  pagesNumber = 0,
  onClickPage = (_page) => {},
  selectedPage = 0
}) {
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setCurrentPage(selectedPage)
  }, [selectedPage])

  function updatePage (page) {
    setCurrentPage(page)
    onClickPage(page)
  }

  const maxSide = 5
  const total = pagesNumber
  const currentOneBased = currentPage + 1
  const start = Math.max(1, currentOneBased - maxSide)
  const end = Math.min(total, currentOneBased + maxSide)

  const indices = []
  if (total > 0) {
    indices.push(1)
    if (start > 2) indices.push('left-ellipsis')
    for (let i = Math.max(2, start); i <= Math.min(total - 1, end); i++) {
      indices.push(i)
    }
    if (end < total - 1) indices.push('right-ellipsis')
    if (total > 1) indices.push(total)
  }

  return (
    <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
      <PlatformaticIcon
        iconName='CircleArrowLeftIcon'
        color={WHITE}
        disabled={currentPage === 0 || total === 0}
        onClick={() => updatePage(currentPage - 1)}
      />
      {indices.map(item => {
        if (typeof item === 'string') {
          return <span key={item} style={{ padding: '0 8px', color: WHITE }}>…</span>
        }
        const idx = item - 1
        return (
          <Button
            key={idx}
            paddingClass={commonStyles.buttonPadding}
            label={`${item}`}
            onClick={() => updatePage(idx)}
            color={WHITE}
            selected={idx === currentPage}
            backgroundColor={TRANSPARENT}
            bordered={false}
          />
        )
      })}
      <PlatformaticIcon
        iconName='CircleArrowRightIcon'
        color={WHITE}
        disabled={currentPage >= total - 1 || total === 0}
        onClick={() => updatePage(currentPage + 1)}
      />
    </div>
  )
}

export default Paginator
