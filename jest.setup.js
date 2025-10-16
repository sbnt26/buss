// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
process.env.SESSION_SECRET = 'test_secret_key_for_testing_purposes_only_1234567890123456'
process.env.NODE_ENV = 'test'



