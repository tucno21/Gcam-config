import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { buttonClassName } from './buttonStyles'
import type { ButtonSize, ButtonVariant } from './buttonStyles'

type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  children: ReactNode
}

export const ButtonLink = ({ variant = 'secondary', size = 'md', leadingIcon, className, children, ...rest }: ButtonLinkProps) => (
  <Link className={buttonClassName({ variant, size, className })} {...rest}>
    {leadingIcon}
    {children}
  </Link>
)
