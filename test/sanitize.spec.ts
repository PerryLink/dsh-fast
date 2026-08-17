/**
 * Sanitization contract: control characters never reach a report or log, and
 * every string stays within its budget. Extreme path/filename cases are
 * covered explicitly (the display/durable-boundary red line).
 * @module dsh-fast/test/sanitize.spec
 */

import { describe, expect, it } from 'vitest'
import { sanitizePath, sanitizeText, stripControl, truncate } from '../src/sanitize.ts'

describe('stripControl', () => {
  it('removes C0 control characters and DEL', () => {
    expect(stripControl('a\u0000b\u001fc\nd\te\u007ff')).toBe('abcdef')
  })

  it('leaves ordinary and unicode text intact', () => {
    expect(stripControl('路径/文件-名_🎉.txt')).toBe('路径/文件-名_🎉.txt')
  })

  it('returns an empty string for an empty input', () => {
    expect(stripControl('')).toBe('')
  })
})

describe('truncate', () => {
  it('leaves a short string intact', () => {
    expect(truncate('abc', 5)).toBe('abc')
  })

  it('appends an ellipsis when it cuts', () => {
    expect(truncate('abcdef', 3)).toBe('abc…')
  })

  it('returns the empty string at a zero budget', () => {
    expect(truncate('abc', 0)).toBe('')
  })

  it('throws on a negative or non-integer budget', () => {
    expect(() => truncate('abc', -1)).toThrow(/maxChars/u)
    expect(() => truncate('abc', 1.5)).toThrow(/maxChars/u)
  })
})

describe('sanitizeText', () => {
  it('strips control characters then truncates', () => {
    expect(sanitizeText('a\u0000b\u001fc', 10)).toBe('abc')
  })

  it('bounds a long filename', () => {
    const result = sanitizeText('x'.repeat(100), 16)
    expect(result.length).toBeLessThanOrEqual(17)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('sanitizePath', () => {
  it('preserves the tail (basename) when truncating a long path', () => {
    const path = 'C:\\Users\\someone\\very\\long\\directory\\structure\\report-final.txt'
    const result = sanitizePath(path, 40)
    expect(result.length).toBeLessThanOrEqual(41)
    expect(result.endsWith('report-final.txt')).toBe(true)
    expect(result).toContain('…')
  })

  it('strips control characters from a path', () => {
    expect(sanitizePath('C:\\dir\u0000\\file.txt', 100)).toBe('C:\\dir\\file.txt')
  })

  it('handles UNC and dot-segment paths without error', () => {
    expect(sanitizePath('\\\\server\\share\\..\\file.txt', 100)).toBe('\\\\server\\share\\..\\file.txt')
  })

  it('returns just an ellipsis for a very small budget', () => {
    expect(sanitizePath('/a/b/c', 1)).toBe('…')
  })

  it('handles unicode filenames', () => {
    expect(sanitizePath('/tmp/报告-🎉.md', 100)).toBe('/tmp/报告-🎉.md')
  })
})
