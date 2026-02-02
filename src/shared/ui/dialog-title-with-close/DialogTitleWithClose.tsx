import type { ReactNode } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { DialogTitle, IconButton } from '@mui/material'
import type { DialogTitleProps } from '@mui/material/DialogTitle'

export type DialogTitleWithCloseProps = DialogTitleProps & {
  children: ReactNode
  onClose: () => void
  closeButtonAriaLabel?: string
}

export const DialogTitleWithClose = ({
  children,
  onClose,
  closeButtonAriaLabel = 'Закрыть',
  sx,
  ...dialogTitleProps
}: DialogTitleWithCloseProps) => {
  return (
    <DialogTitle
      sx={{
        position: 'relative',
        pr: 6,
        ...sx,
      }}
      {...dialogTitleProps}
    >
      {children}
      <IconButton
        aria-label={closeButtonAriaLabel}
        onClick={onClose}
        sx={(theme) => ({
          position: 'absolute',
          right: theme.spacing(1),
          top: theme.spacing(1),
          color: theme.palette.grey[500],
        })}
      >
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  )
}

