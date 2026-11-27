/**
 * Проверки на часовом поясе с переводом часов.
 * Часы переводят в 02:00–03:00, то есть до начала дня малыша (6:00).
 * Поэтому 23 часа длится день 28 марта 2026 (стрелки вперёд), а 25 часов — день 24 октября (назад).
 */
import { afterAll, describe, expect, it, vi } from 'vitest'
import { dayKeyOf, dayRange } from './day'
import { nextOccurrence } from '../reminders/schedule'
import { at, HOUR_MS } from '../../test/helpers'

// Весь файл идёт в поясе с переводом часов. Дата читает пояс в момент создания,
// поэтому смена действует на все тесты ниже.
vi.stubEnv('TZ', 'Europe/Berlin')

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('границы дня при переводе часов', () => {
  it('день начинается в 6:00 по местному времени независимо от пояса', () => {
    const { from } = dayRange('2026-03-29')
    expect(from.getHours()).toBe(6)
    expect(from.getMinutes()).toBe(0)
  })

  it('в ночь перевода вперёд день короче на час', () => {
    const { from, to } = dayRange('2026-03-28')
    expect(from.getDate()).toBe(28)
    expect(to.getDate()).toBe(29)
    expect(to.getTime() - from.getTime()).toBe(23 * HOUR_MS)
  })

  it('в ночь перевода назад день длиннее на час', () => {
    const { from, to } = dayRange('2026-10-24')
    expect(to.getTime() - from.getTime()).toBe(25 * HOUR_MS)
  })

  it('после перевода вперёд момент до 6 утра всё ещё относится к прошлому дню', () => {
    expect(dayKeyOf(at(2026, 3, 29, 3, 30))).toBe('2026-03-28')
    expect(dayKeyOf(at(2026, 3, 29, 6, 0))).toBe('2026-03-29')
  })
})

describe('напоминания при переводе часов', () => {
  it('ежедневное напоминание остаётся в 10:00 по местному времени', () => {
    const next = nextOccurrence({ kind: 'daily', time: '10:00' }, at(2026, 3, 28, 11))
    expect(next?.getDate()).toBe(29)
    expect(next?.getHours()).toBe(10)
    expect(next?.getMinutes()).toBe(0)
  })

  it('интервал считается по прошедшему времени, а не по цифрам на часах', () => {
    // В ночь с 28 на 29 марта часа два не было: с 01:30 до 04:30 прошло два часа.
    const next = nextOccurrence(
      { kind: 'interval', everyMinutes: 120, from: at(2026, 3, 29, 1, 30), to: null },
      at(2026, 3, 29, 1, 30),
    )
    expect(next?.getHours()).toBe(4)
    expect(next?.getMinutes()).toBe(30)
  })
})
