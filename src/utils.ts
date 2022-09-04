export function dateFormat(date: Date, fmt = 'YYYY-mm-dd HH:MM:SS sss'): string {
  const opt: Record<string, string> = {
    'Y+': date.getFullYear().toString(),
    'm+': (date.getMonth() + 1).toString(),
    'd+': date.getDate().toString(),
    'H+': date.getHours().toString(),
    'M+': date.getMinutes().toString(),
    'S+': date.getSeconds().toString(),
    's+': date.getMilliseconds().toString(),
  }
  for (const k in opt) {
    const ret = new RegExp('(' + k + ')').exec(fmt)
    if (ret) {
      fmt = fmt.replace(ret[1], ret[1].length === 1 ? opt[k] : opt[k].padStart(ret[1].length, '0'))
    }
  }
  return fmt
}

export function logger(...msg: string[]) {
  if (process.env.NODE_ENV === 'development') {
    const date = dateFormat(new Date())
    console.log(`[${date}] ${msg.join(' ')}`)
  }
}
