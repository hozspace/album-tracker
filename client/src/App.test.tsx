import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { App } from './App'

test('renders the diary route at /', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Diary' })).toBeInTheDocument()
})
