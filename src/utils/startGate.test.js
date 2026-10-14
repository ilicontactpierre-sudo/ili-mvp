import { describe, it, expect, vi, afterEach } from 'vitest'
import { waitForSounds, SLOW_MS, SLOW_AGAIN_MS } from './startGate.js'

function fakeLoader(initial = {}) {
  const st = new Map(Object.entries(initial))
  const listeners = new Set()
  return {
    status: (id) => (st.has(id) ? st.get(id) : null),
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    settle(id, status = 'loaded') { st.set(id, status); [...listeners].forEach((f) => f({ type: status, id })) },
    listenerCount: () => listeners.size,
  }
}

afterEach(() => { vi.useRealTimers() })

describe('waitForSounds', () => {
  it('le seuil d\'alerte par défaut est de 15 s (puis 30 s si on attend encore)', () => {
    expect(SLOW_MS).toBe(15000)
    expect(SLOW_AGAIN_MS).toBe(30000)
  })

  it('rien à attendre : prêt tout de suite', async () => {
    const g = waitForSounds(fakeLoader(), [])
    await expect(g.done).resolves.toBe('ready')
  })

  it('sons déjà chargés (cache du téléphone) : prêt tout de suite', async () => {
    const g = waitForSounds(fakeLoader({ a: 'loaded', b: 'loaded' }), ['a', 'b'])
    await expect(g.done).resolves.toBe('ready')
  })

  it('compte la progression et finit quand tous les sons attendus sont réglés', async () => {
    const l = fakeLoader({ a: 'active', b: 'pending' })
    const prog = []
    const g = waitForSounds(l, ['a', 'b'], { onProgress: (n, t) => prog.push(`${n}/${t}`) })
    l.settle('a')
    l.settle('b')
    await expect(g.done).resolves.toBe('ready')
    expect(prog).toEqual(['0/2', '1/2', '2/2'])
  })

  it('un son en échec définitif compte comme réglé (on ne bloque pas l\'histoire)', async () => {
    const l = fakeLoader({ a: 'active' })
    const g = waitForSounds(l, ['a'])
    l.settle('a', 'failed')
    await expect(g.done).resolves.toBe('ready')
  })

  it('un son inconnu du chargeur compte comme réglé', async () => {
    const g = waitForSounds(fakeLoader(), ['inconnu'])
    await expect(g.done).resolves.toBe('ready')
  })

  it('n\'attend pas les sons qui ne sont pas dans la liste demandée', async () => {
    const l = fakeLoader({ a: 'active', autre: 'pending' })
    const g = waitForSounds(l, ['a'])
    l.settle('a')
    await expect(g.done).resolves.toBe('ready')
  })

  it('appelle onSlow après 15 s si les sons ne sont pas prêts, une seule fois', async () => {
    vi.useFakeTimers()
    const onSlow = vi.fn()
    waitForSounds(fakeLoader({ a: 'active' }), ['a'], { onSlow })
    await vi.advanceTimersByTimeAsync(14999)
    expect(onSlow).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onSlow).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60000)
    expect(onSlow).toHaveBeenCalledTimes(1)
  })

  it('n\'appelle jamais onSlow si les sons arrivent avant 15 s', async () => {
    vi.useFakeTimers()
    const onSlow = vi.fn()
    const l = fakeLoader({ a: 'active' })
    const g = waitForSounds(l, ['a'], { onSlow })
    await vi.advanceTimersByTimeAsync(5000)
    l.settle('a')
    await g.done
    await vi.advanceTimersByTimeAsync(60000)
    expect(onSlow).not.toHaveBeenCalled()
  })

  it('si les sons arrivent pendant que l\'alerte est affichée, l\'attente se termine seule', async () => {
    vi.useFakeTimers()
    const l = fakeLoader({ a: 'active' })
    const g = waitForSounds(l, ['a'], { onSlow: () => {} })
    await vi.advanceTimersByTimeAsync(16000)
    l.settle('a')
    await expect(g.done).resolves.toBe('ready')
  })

  it('continueNow termine l\'attente, ignore les sons suivants et annule l\'alerte', async () => {
    vi.useFakeTimers()
    const onSlow = vi.fn()
    const l = fakeLoader({ a: 'active' })
    const g = waitForSounds(l, ['a'], { onSlow })
    g.continueNow()
    await expect(g.done).resolves.toBe('continued')
    await vi.advanceTimersByTimeAsync(60000)
    expect(onSlow).not.toHaveBeenCalled()
    expect(l.listenerCount()).toBe(0)
  })

  it('waitMore relance l\'alerte après 30 s (pas 15)', async () => {
    vi.useFakeTimers()
    const onSlow = vi.fn()
    const g = waitForSounds(fakeLoader({ a: 'active' }), ['a'], { onSlow })
    await vi.advanceTimersByTimeAsync(15000)
    expect(onSlow).toHaveBeenCalledTimes(1)
    g.waitMore()
    await vi.advanceTimersByTimeAsync(29999)
    expect(onSlow).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(onSlow).toHaveBeenCalledTimes(2)
  })

  it('cancel termine l\'attente (écran quitté) et se désabonne du chargeur', async () => {
    const l = fakeLoader({ a: 'active' })
    const g = waitForSounds(l, ['a'])
    expect(l.listenerCount()).toBe(1)
    g.cancel()
    await expect(g.done).resolves.toBe('cancelled')
    expect(l.listenerCount()).toBe(0)
  })
})
