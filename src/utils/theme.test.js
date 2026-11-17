import { describe, it, expect } from 'vitest'
import { isLightTheme, readIsLightTheme } from './theme.js'

const fakeStorage = (value) => ({ getItem: () => value })

describe('isLightTheme', () => {
  it('sombre (par défaut) → false', () => {
    expect(isLightTheme({ isDark: true, isToutdoux: false, isSynthwave: false })).toBe(false)
  })
  it('clair → true', () => {
    expect(isLightTheme({ isDark: false, isToutdoux: false, isSynthwave: false })).toBe(true)
  })
  it('Toutdoux (papier) → true, même si isDark vaut true', () => {
    expect(isLightTheme({ isDark: true, isToutdoux: true, isSynthwave: false })).toBe(true)
  })
  it('Synthwave → false', () => {
    expect(isLightTheme({ isDark: true, isToutdoux: false, isSynthwave: true })).toBe(false)
  })
  it('valeur absente ou bizarre → false', () => {
    expect(isLightTheme(null)).toBe(false)
    expect(isLightTheme('clair')).toBe(false)
    expect(isLightTheme({})).toBe(false)
  })
})

describe('readIsLightTheme', () => {
  it('lit le thème enregistré', () => {
    expect(readIsLightTheme(fakeStorage(JSON.stringify({ isDark: false })))).toBe(true)
    expect(readIsLightTheme(fakeStorage(JSON.stringify({ isDark: true })))).toBe(false)
  })
  it('rien d\'enregistré → sombre', () => {
    expect(readIsLightTheme(fakeStorage(null))).toBe(false)
  })
  it('JSON abîmé → sombre, sans planter', () => {
    expect(readIsLightTheme(fakeStorage('{pas du json'))).toBe(false)
  })
  it('stockage qui plante → sombre, sans planter', () => {
    expect(readIsLightTheme({ getItem: () => { throw new Error('bloqué') } })).toBe(false)
  })
})
