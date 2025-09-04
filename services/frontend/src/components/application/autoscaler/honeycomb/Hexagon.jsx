import * as React from 'react'

export default function Hexagon ({
  children,
  className,
  style = {}
}) {
  const gap = 4
  const clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
  const elementStyle = {
    ...style,
    position: 'absolute',
    clipPath,
    pointerEvents: 'auto'
  }
  if (className !== 'inner') {
    elementStyle.top = gap / 2
    elementStyle.left = gap / 2
    elementStyle.right = gap / 2
    elementStyle.bottom = gap / 2
  }
  return (
    <div
      className={className}
      style={elementStyle}
    >
      {children}
    </div>
  )
};
