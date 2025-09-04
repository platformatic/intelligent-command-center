export function getGridColumnsCount (
  hexagonSide,
  containerWidth
) {
  const hexagonWidth = Math.sqrt(3) * hexagonSide
  const columns = Math.floor(containerWidth / hexagonWidth)
  return columns
}

export function getRowSize (hexagonSide) {
  return hexagonSide / 2
}

export function getColumnSize (hexagonSide) {
  return (Math.sqrt(3) * hexagonSide) / 4
}
