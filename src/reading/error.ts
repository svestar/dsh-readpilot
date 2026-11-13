export class ReaderError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ReaderError'
    this.code = code
  }
}
