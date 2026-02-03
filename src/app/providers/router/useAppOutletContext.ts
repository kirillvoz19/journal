import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from './outletContext'

export const useAppOutletContext = (): AppOutletContext => {
  return useOutletContext<AppOutletContext>()
}

