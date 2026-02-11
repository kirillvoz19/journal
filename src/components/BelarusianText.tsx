import React from 'react'
import { Tooltip } from '@mui/material'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface BelarusianTextProps {
  belarusian: string
  russian: string
  children?: React.ReactNode
  placement?: TooltipPlacement
}

export const BelarusianText: React.FC<BelarusianTextProps> = ({
  belarusian,
  russian,
  children,
  placement = 'top',
}) => {
  return (
    <Tooltip title={russian} arrow placement={placement}>
      <span style={{ cursor: 'help' }}>{children || belarusian}</span>
    </Tooltip>
  )
}
