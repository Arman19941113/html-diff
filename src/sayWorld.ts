export function sayWorld() {
  const msg = 'world'
  if (process.env.NODE_ENV !== 'production') {
    console.log(msg + '-dev')
  } else {
    console.log(msg + '-pro')
  }

  return msg
}
