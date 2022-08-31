import { sayWorld } from '../src'

describe('sayHello', () => {
  it('should say hello', function () {
    const msg = sayWorld()
    expect(msg).toBe('world')
  })
})
