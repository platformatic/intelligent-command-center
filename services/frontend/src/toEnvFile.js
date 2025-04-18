export function toEnvFile (obj, e) {
  e.preventDefault()
  let fileData = ''
  obj.values.forEach(value => {
    fileData += `${value}
`
  })

  const blob = new Blob([fileData], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${obj.filename}.plt.txt`
  link.href = url
  link.target = '_blank'
  link.click()
}
