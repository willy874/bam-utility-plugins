export function isDarkMode(): boolean {
  const mediaQuery = matchMedia('(prefers-color-scheme: dark)')
  return mediaQuery.matches
}

export function isClass(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Function]' && typeof value === 'function' && 'constructor' in value
}

export function isArrayEmpty(value: unknown): boolean {
  return Array.isArray(value) && JSON.stringify(value.filter(Boolean)) === '[]'
}

export function isObjectEmpty(value: unknown): boolean {
  return typeof value === 'object' && value !== null && value.constructor === Object && JSON.stringify(value) === '{}'
}

export function isBlobEmpty(value: unknown): boolean {
  return value instanceof Blob && (value.size === 0 || value.type === '')
}

export function isStringEmpty(value: unknown): boolean {
  return typeof value === 'string' && /^\s*$/.test(value)
}

export function isNumberEmpty(value: unknown): boolean {
  return typeof value === 'number' && isNaN(value)
}

export function isEmpty(value: unknown): boolean {
  if (value === undefined) return true
  if (value === null) return true
  if (isNumberEmpty(value)) return true
  if (isStringEmpty(value)) return true
  if (isArrayEmpty(value)) return true
  if (isObjectEmpty(value)) return true
  if (isBlobEmpty(value)) return true
  return false
}

export function isTextIncludes(data: Array<string | RegExp>, text: string): boolean {
  for (let index = 0; index < data.length; index++) {
    const value = data[index]
    if (value instanceof RegExp) {
      if (value.test(text)) return true
    } else {
      const reg = new RegExp(String(value))
      if (reg.test(text)) return true
    }
  }
  return false
}

export function isTextExcludes(data: Array<string | RegExp>, text: string): boolean {
  for (let index = 0; index < data.length; index++) {
    const value = data[index]
    if (value instanceof RegExp) {
      if (value.test(text)) return false
    } else {
      const reg = new RegExp(String(value))
      if (reg.test(text)) return false
    }
  }
  return true
}
