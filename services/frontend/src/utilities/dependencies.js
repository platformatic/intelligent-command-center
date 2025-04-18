export function getHumanReadableDependencies (dependencies = [], taxonomy = undefined) {
  if (!dependencies || dependencies.length === 0) {
    return []
  }
  const dependenciesToReturn = dependencies.map(dependency => {
    if (taxonomy) {
      const application = taxonomy.applications.find(application => application.id === dependency.applicationId)
      return { id: `${application.name}/${dependency.serviceId}` }
    } else {
      return undefined
    }
  })

  return dependenciesToReturn.filter(dep => !!dep)
}
