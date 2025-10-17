// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.SESSION_SECRET = 'test_secret_key_for_testing_purposes_only_1234567890123456'
process.env.NODE_ENV = 'test'

// Polyfills for Node environment
const { TextEncoder, TextDecoder } = require('util')
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder
}

try {
  const { ReadableStream, WritableStream } = require('stream/web')
  if (!global.ReadableStream) {
    global.ReadableStream = ReadableStream
  }
  if (!global.WritableStream) {
    global.WritableStream = WritableStream
  }
} catch (error) {
  // ignore if not available
}

try {
  const { MessageChannel, MessagePort } = require('worker_threads')
  if (!global.MessageChannel) {
    global.MessageChannel = MessageChannel
  }
  if (!global.MessagePort) {
    global.MessagePort = MessagePort
  }
} catch (error) {
  // ignore if workers not available
}

const { Headers, Request, Response, FormData, File, Blob } = require('undici')

if (!global.Headers) {
  global.Headers = Headers
}
if (!global.Request) {
  global.Request = Request
}
if (!global.Response) {
  global.Response = Response
}
if (!global.FormData) {
  global.FormData = FormData
}
if (!global.Blob) {
  global.Blob = Blob
}
if (!global.File) {
  global.File = File
}
