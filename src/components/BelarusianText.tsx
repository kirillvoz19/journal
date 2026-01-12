import React from 'react'
import { Tooltip } from '@mui/material'

interface BelarusianTextProps {
  belarusian: string
  russian: string
  children?: React.ReactNode
}

export const BelarusianText: React.FC<BelarusianTextProps> = ({
  belarusian,
  russian,
  children,
}) => {
  return (
    <Tooltip title={russian} arrow placement="top">
      <span style={{ cursor: 'help' }}>{children || belarusian}</span>
    </Tooltip>
  )
}
