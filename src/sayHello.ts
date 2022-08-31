export function sayHello() {
  const msg = 'hello'
  if (process.env.NODE_ENV !== 'production') {
    console.log(msg + '-dev')
  } else {
    console.log(msg + '-pro')
  }

  return msg
}
