import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

describe('Field', () => {
  it('wires htmlFor to the control it generates an id for', () => {
    render(
      <Field label="Weight">
        <Input readOnly value="70" />
      </Field>,
    )
    const input = screen.getByLabelText('Weight') as HTMLInputElement
    expect(input.value).toBe('70')
  })

  it('reuses an id the control already carries instead of overriding it', () => {
    render(
      <Field label="Weight">
        <Input id="weight-kg" readOnly value="70" />
      </Field>,
    )
    const input = screen.getByLabelText('Weight') as HTMLInputElement
    expect(input.id).toBe('weight-kg')
  })

  it('describes the control by the hint id when only a hint is given', () => {
    render(
      <Field label="Weight" hint="In kilograms">
        <Input readOnly value="70" />
      </Field>,
    )
    const input = screen.getByLabelText('Weight')
    const hint = screen.getByText('In kilograms')
    expect(input.getAttribute('aria-describedby')).toBe(hint.id)
  })

  it('describes the control by both hint and error ids when both are given', () => {
    render(
      <Field label="Weight" hint="In kilograms" error="Must be positive">
        <Input readOnly value="-1" />
      </Field>,
    )
    const input = screen.getByLabelText('Weight')
    const hint = screen.getByText('In kilograms')
    const error = screen.getByText('Must be positive')
    const describedBy = input.getAttribute('aria-describedby')!.split(' ')
    expect(describedBy).toContain(hint.id)
    expect(describedBy).toContain(error.id)
  })

  it('sets aria-invalid on the control only when there is an error', () => {
    const { rerender } = render(
      <Field label="Weight">
        <Input readOnly value="70" />
      </Field>,
    )
    expect(screen.getByLabelText('Weight').hasAttribute('aria-invalid')).toBe(false)

    rerender(
      <Field label="Weight" error="Required">
        <Input readOnly value="" />
      </Field>,
    )
    expect(screen.getByLabelText('Weight').getAttribute('aria-invalid')).toBe('true')
  })

  it('renders the error with role="alert" so it is announced', () => {
    render(
      <Field label="Weight" error="Required">
        <Input readOnly value="" />
      </Field>,
    )
    expect(screen.getByRole('alert').textContent).toBe('Required')
  })

  it('gives two Field instances distinct, non-colliding ids', () => {
    render(
      <>
        <Field label="Weight">
          <Input readOnly value="70" />
        </Field>
        <Field label="Height">
          <Input readOnly value="180" />
        </Field>
      </>,
    )
    const weight = screen.getByLabelText('Weight') as HTMLInputElement
    const height = screen.getByLabelText('Height') as HTMLInputElement
    expect(weight.id).not.toBe(height.id)
  })

  it('merges className on the wrapping .field element', () => {
    render(
      <Field label="Weight" className="extra">
        <Input readOnly value="70" />
      </Field>,
    )
    const wrapper = screen.getByText('Weight').parentElement!
    expect(wrapper.className).toContain('field')
    expect(wrapper.className).toContain('extra')
  })
})
