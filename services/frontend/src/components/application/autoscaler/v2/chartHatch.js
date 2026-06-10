export function drawFutureHatch (defs, g, patternId, xScale, innerW, innerH) {
  const hatch = defs.append('pattern')
    .attr('id', patternId)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 10)
    .attr('height', 10)
  hatch.append('rect').attr('width', 10).attr('height', 10).attr('fill', 'none')
  hatch.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', 10).attr('y2', 10)
    .attr('stroke', 'rgba(255,255,255,0.06)').attr('stroke-width', 2)

  g.append('rect')
    .attr('x', xScale(0)).attr('y', 0)
    .attr('width', Math.max(0, innerW - xScale(0)))
    .attr('height', innerH)
    .attr('fill', `url(#${patternId})`)
}
