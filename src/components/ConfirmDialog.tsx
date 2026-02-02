import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'
import { BelarusianText } from './BelarusianText'
import { DialogTitleWithClose } from '../shared/ui/dialog-title-with-close'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: React.ReactNode
  message: React.ReactNode
  confirmText?: React.ReactNode
  cancelText?: React.ReactNode
  confirmColor?: 'primary' | 'error' | 'warning'
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmColor = 'error',
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitleWithClose onClose={onClose}>{title}</DialogTitleWithClose>
      <DialogContent>
        <Typography component="div" sx={{ whiteSpace: 'pre-line' }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {cancelText || (
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          )}
        </Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained">
          {confirmText || (
            <BelarusianText belarusian="Пацвердзіць" russian="Подтвердить" />
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
