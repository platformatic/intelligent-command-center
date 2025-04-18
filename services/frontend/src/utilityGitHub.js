export function getGithubLink (commitUserEmail, repositoryName, prNumber) {
  return `https://github.com/${commitUserEmail}/${repositoryName}/pull/${prNumber}`
}
