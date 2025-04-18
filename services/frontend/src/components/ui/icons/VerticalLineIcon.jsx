import { ERROR_RED, WHITE, MAIN_GREEN } from '@platformatic/ui-components/src/components/constants'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import styles from './VerticalLineIcon.module.css'

const VerticalLineIcon = ({
  id = 'defaultId',
  className = '',
  color = ERROR_RED,
  fromRef = null,
  toRef = null,
  smallStroke = false,
  animationDelay = 0.0,
  cancelAnimation = false
}) => {
  const [height, setHeight] = useState(0)
  const [diffHeight, setDiffHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const [yToRef, setYToRef] = useState(0)
  const [yfromRef, setYfromRef] = useState(0)
  let clefClassName = `${styles.clef} `
  clefClassName += styles[`clef-${color}`]
  const strokeWidth = smallStroke ? 1 : 2
  const strokeWidthAnimation = smallStroke ? 1 : 6

  useEffect(() => {
    if (fromRef?.current) {
      setYfromRef(fromRef.current.getBoundingClientRect().y)
    }
  }, [fromRef])

  useEffect(() => {
    if (toRef?.current) {
      setYToRef(toRef.current.getBoundingClientRect().y)
    }
  }, [toRef])

  useEffect(() => {
    if (yToRef > 0 && yfromRef > 0) {
      function getDistance () {
        let diff = yToRef - yfromRef
        setDiffHeight(yToRef - yfromRef)
        setHeight(diff - 8)
        diff = toRef.current.getBoundingClientRect().x - fromRef.current.getBoundingClientRect().x
        setWidth(diff - 15)
      }
      getDistance()
    }
  }, [toRef, yToRef])

  function renderSvg () {
    const verticalLineEndAtY = height - 7
    const verticalLineEndAtY2 = verticalLineEndAtY - 1
    const arcHeight = 7
    const secondLineEndAtY = height - 1

    const styleSheet = document.styleSheets[0]
    styleSheet.insertRule(`@-webkit-keyframes draw1-${id} {
      from { stroke-dashoffset: ${diffHeight}; }
      to { stroke-dashoffset: 0; }
    }`, styleSheet.cssRules.length)
    styleSheet.insertRule(`@-webkit-keyframes draw2-${id} {
      from { stroke-dashoffset: 20; }
      to { stroke-dashoffset: 0; }
    }`, styleSheet.cssRules.length)
    styleSheet.insertRule(`@-webkit-keyframes draw3-${id} {
      from { stroke-dashoffset: 50; }
      to { stroke-dashoffset: 0; }
    }`, styleSheet.cssRules.length)

    let animationDelay2 = 0.0
    let animationDelay3 = 0.0
    let duration1 = 0.0
    let duration2 = 0.0
    let duration3 = 0.0

    if (!cancelAnimation) {
      animationDelay2 = animationDelay + 0.5
      animationDelay3 = animationDelay2 + 0.1
      duration1 = 0.5
      duration2 = 0.1
      duration3 = 0.2
    }

    const styleAnimation1 = {
      fill: 'none',
      stroke: 'white',
      strokeWidth: strokeWidthAnimation,
      strokeDasharray: diffHeight,
      strokeDashoffset: diffHeight,
      animation: `draw1-${id} ${duration1}s ${animationDelay}s linear forwards`
    }

    const styleAnimation2 = {
      fill: 'none',
      stroke: 'white',
      strokeWidth: strokeWidthAnimation,
      strokeDasharray: 20,
      strokeDashoffset: 20,
      animation: `draw2-${id} ${duration2}s ${animationDelay2}s linear forwards`
    }

    const styleAnimation3 = {
      fill: 'none',
      stroke: 'white',
      strokeWidth: strokeWidthAnimation,
      strokeDasharray: 50,
      strokeDashoffset: 50,
      animation: `draw3-${id} ${duration3}s ${animationDelay3}s linear forwards`
    }

    // const classMask2 = `${styles.pathMask} ${styles.animationMask2}`
    // const classMask3 = `${styles.pathMask} ${styles.animationMask3}`
    const pathMask2 = `M0.999998,${verticalLineEndAtY2} a${arcHeight},${arcHeight} 0 0,0 ${arcHeight},${arcHeight}`

    return (
      <svg
        key={id}
        id={id}
        className={className}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <defs>
          <mask id={`mask1-${id}`} maskUnits='userSpaceOnUse'>
            <path style={styleAnimation1} d={`M0.999973 -1.35506e-06L0.999998 ${verticalLineEndAtY}`} />
          </mask>
          <mask id={`mask2-${id}`} maskUnits='userSpaceOnUse'>
            <path style={styleAnimation2} d={pathMask2} />
          </mask>
          <mask id={`mask3-${id}`} maskUnits='userSpaceOnUse'>
            <path style={styleAnimation3} d={`M7 ${secondLineEndAtY}L${width} ${secondLineEndAtY}`} />
          </mask>
        </defs>
        <path
          className={clefClassName}
          mask={`url(#mask1-${id})`}
          d={`M0.999973 -1.35506e-06L0.999998 ${verticalLineEndAtY}`}
          stroke={WHITE}
          strokeWidth={strokeWidth}
        />
        <path
          className={clefClassName}
          mask={`url(#mask2-${id})`}
          d={pathMask2}
          stroke={WHITE}
          strokeWidth={strokeWidth}
        />
        <path
          className={clefClassName}
          mask={`url(#mask3-${id})`}
          d={`M7 ${secondLineEndAtY}L${width} ${secondLineEndAtY}`}
          stroke={WHITE}
          strokeWidth={strokeWidth}
        />
      </svg>
    )
  }

  return height ? renderSvg() : <></>
}

VerticalLineIcon.propTypes = {
  /**
   * id
   */
  id: PropTypes.string.isRequired,
  /**
   * className
   */
  className: PropTypes.string,
  /**
   * color
   */
  color: PropTypes.oneOf([MAIN_GREEN, ERROR_RED]),
  /**
   * fromRef
   */
  fromRef: PropTypes.object,
  /**
   * toRef
   */
  toRef: PropTypes.object,
  /**
   * smallStroke
   */
  smallStroke: PropTypes.bool,
  /**
   * animationDelay
   */
  animationDelay: PropTypes.number,
  /**
   * cancelAnimation
   */
  cancelAnimation: PropTypes.bool
}

export default VerticalLineIcon
