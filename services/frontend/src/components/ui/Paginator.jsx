import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import commonStyles from '~/styles/CommonStyles.module.css'
import { Button, PlatformaticIcon } from '@platformatic/ui-components'
import { TRANSPARENT, WHITE } from '@platformatic/ui-components/src/components/constants'

function Paginator ({
  pagesNumber = 0,
  onClickPage = () => {},
  selectedPage = 0
}) {
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setCurrentPage(selectedPage)
  }, [selectedPage])

  useEffect(() => {
    if (pagesNumber > 0) {
      setPages(Array.from(
        new Array(pagesNumber).keys())
        .map(index => ({ index, label: `${index + 1}`, value: index + 1 }))
      )
    }
  }, [pagesNumber])

  function updatePage (page) {
    setCurrentPage(page)
    onClickPage(page)
  }

  return (
    <div className={`${commonStyles.smallFlexRow} ${commonStyles.fullWidth} ${commonStyles.justifyCenter}`}>
      <PlatformaticIcon
        iconName='CircleArrowLeftIcon'
        color={WHITE}
        disabled={currentPage === 0}
        onClick={() => updatePage(currentPage - 1)}
      />
      {pages.map(page =>
        <Button
          key={page.index}
          paddingClass={commonStyles.buttonPadding}
          label={page.label}
          onClick={() => updatePage(page.value - 1)}
          color={WHITE}
          selected={page.index === currentPage}
          backgroundColor={TRANSPARENT}
          bordered={false}
        />
      )}
      <PlatformaticIcon
        iconName='CircleArrowRightIcon'
        color={WHITE}
        disabled={currentPage === pages.length - 1}
        onClick={() => updatePage(currentPage + 1)}
      />
    </div>
  )
}

Paginator.propTypes = {
  /**
   * pagesNumber
  */
  pagesNumber: PropTypes.number,
  /**
   * titleClassName
  */
  titleClassName: PropTypes.string,
  /**
   * iconName
  */
  iconName: PropTypes.string
}

export default Paginator
