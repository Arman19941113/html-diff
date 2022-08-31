import { sayHello } from '../src'

describe('sayHello', () => {
  it('should say hello', function () {
    const msg = sayHello()
    expect(msg).toBe('hello')
  })
})
