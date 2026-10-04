import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceDisplay } from '@/components/product/price-display'

describe('<PriceDisplay />', () => {
  it('renders the sale price', () => {
    render(<PriceDisplay price={890} />)
    expect(screen.getByTestId('sale-price')).toHaveTextContent('890.00 LE')
  })

  it('renders the compare-at price and discount when discounted', () => {
    render(<PriceDisplay price={1000} compareAtPrice={1250} />)
    expect(screen.getByText('1,000.00 LE')).toBeInTheDocument()
    expect(screen.getByText('1,250.00 LE')).toBeInTheDocument()
    expect(screen.getByText('-20%')).toBeInTheDocument()
  })

  it('does not render discount when prices are equal', () => {
    render(<PriceDisplay price={500} compareAtPrice={500} />)
    expect(screen.queryByText(/-%/)).not.toBeInTheDocument()
  })
})