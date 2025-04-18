export class ApplicationDeletedError extends Error {
  constructor (message) {
    super(message)
    this.name = 'ApplicationDeletedError'
  }
}
