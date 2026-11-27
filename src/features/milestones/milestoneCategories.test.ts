import { describe, expect, it } from 'vitest'
import { MILESTONE_CATEGORIES, milestoneCategory } from './milestoneCategories'

describe('milestoneCategories', () => {
  it('список содержит «Другое» и категории с уникальными id', () => {
    const ids = MILESTONE_CATEGORIES.map((category) => category.id)
    expect(ids).toContain('other')
    expect(new Set(ids).size).toBe(ids.length)
    // У каждой категории есть подпись и значок.
    for (const category of MILESTONE_CATEGORIES) {
      expect(category.title).not.toBe('')
      expect(category.icon).toBeDefined()
    }
  })

  it('известный id даёт свою подпись', () => {
    expect(milestoneCategory('first-smile').title).toBe('Первая улыбка')
    expect(milestoneCategory('first-step').title).toBe('Первый шаг')
  })

  it('неизвестный или пустой id показывается как «Другое»', () => {
    expect(milestoneCategory('was-removed').title).toBe('Другое')
    expect(milestoneCategory(null).title).toBe('Другое')
    expect(milestoneCategory(undefined).title).toBe('Другое')
  })
})
