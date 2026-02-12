import { useState, useRef } from 'react'
import {
  Box,
  Button,
  Container,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material'
import { Outlet } from 'react-router-dom'
import { BelarusianText } from '../../components/BelarusianText'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { AuthenticatedFetch } from '../../features/groups/model/attendance'

export interface AuthenticatedLayoutProps {
  authenticatedFetch: AuthenticatedFetch
  onLogout: () => void
  isAdmin: boolean
  isTeacher: boolean
  username: string
}

function HeaderTitle(props: { isAdmin: boolean; isTeacher: boolean; username: string }) {
  const { isAdmin, isTeacher, username } = props
  if (isAdmin) {
    return (
      <Tooltip title="Журнал администратора" arrow>
        <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
          Журнал адміністратара
        </Typography>
      </Tooltip>
    )
  }
  if (isTeacher && username) {
    return (
      <Tooltip title={`Журнал для учителя ${username}`} arrow>
        <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
          Журнал для настаўніка {username}
        </Typography>
      </Tooltip>
    )
  }
  return (
    <Tooltip title="Журнал" arrow>
      <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
        Журнал
      </Typography>
    </Tooltip>
  )
}

const RESTORE_WARNING_ADMIN = {
  belarusian:
    'Існыя даныя не зменяцца. Загружаная копія стварыць новыя групы і выкладчыкаў (з паметкай «адноўлена»), якія вы зможаце рэдагаваць або выдаліць.',
  russian:
    'Имеющиеся данные не изменятся. Загруженная копия создаст новые группы и преподавателей (с пометкой «восстановлено»), которые вы сможете редактировать или удалить.',
}
const RESTORE_WARNING_TEACHER = {
  belarusian:
    'Існыя даныя не зменяцца. Загружаная копія стварыць новыя групы (з паметкай «адноўлена»), якія вы зможаце рэдагаваць або выдаліць.',
  russian:
    'Имеющиеся данные не изменятся. Загруженная копия создаст новые группы (с пометкой «восстановлено»), которые вы сможете редактировать или удалить.',
}

export const AuthenticatedLayout = (props: AuthenticatedLayoutProps) => {
  const { authenticatedFetch, onLogout, isAdmin, isTeacher, username } = props
  const [backupMenuAnchor, setBackupMenuAnchor] = useState<null | HTMLElement>(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBackupMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setBackupMenuAnchor(e.currentTarget)
  }
  const handleBackupMenuClose = () => {
    setBackupMenuAnchor(null)
  }

  const handleSaveNewBackup = async () => {
    handleBackupMenuClose()
    try {
      const res = await authenticatedFetch('/api/backup')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to download backup')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match ? match[1] : `journal-backup-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: 'Копія захавана', severity: 'success' })
    } catch (e) {
      setSnackbar({
        open: true,
        message: e instanceof Error ? e.message : 'Не ўдалося захаваць копію',
        severity: 'error',
      })
    }
  }

  const handleRestoreOptionClick = () => {
    handleBackupMenuClose()
    setRestoreConfirmOpen(true)
  }

  const handleRestoreConfirmOk = () => {
    setRestoreConfirmOpen(false)
    fileInputRef.current?.click()
  }

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await authenticatedFetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = (await res.json()) as { success?: boolean; error?: string; teachersCreated?: number; groupsCreated?: number }
      if (!res.ok) {
        throw new Error(result.error || 'Restore failed')
      }
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Копія паспяхова загружана. Адноўлена: ${result.teachersCreated ?? 0} выкладчыкаў, ${result.groupsCreated ?? 0} груп`,
          severity: 'success',
        })
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Не ўдалося аднавіць копію',
        severity: 'error',
      })
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <HeaderTitle isAdmin={isAdmin} isTeacher={isTeacher} username={username} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BelarusianText belarusian="Кіраванне копіямі" russian="Управление копиями">
              <Button variant="outlined" onClick={handleBackupMenuOpen} sx={{ cursor: 'pointer' }}>
                Кіраванне копіямі
              </Button>
            </BelarusianText>
            <Menu
              anchorEl={backupMenuAnchor}
              open={Boolean(backupMenuAnchor)}
              onClose={handleBackupMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleSaveNewBackup}>
                <BelarusianText belarusian="Захаваць новую" russian="Сохранить новую копию" placement="left" />
              </MenuItem>
              <MenuItem onClick={handleRestoreOptionClick}>
                <BelarusianText belarusian="Загрузіць існуючую" russian="Загрузить существующую копию" placement="left" />
              </MenuItem>
            </Menu>
            <Button variant="outlined" onClick={onLogout}>
              <BelarusianText belarusian="Выйсці" russian="Выйти" />
            </Button>
          </Box>
        </Box>

        <input
          type="file"
          accept=".json,application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleRestoreFileChange}
        />

        <ConfirmDialog
          open={restoreConfirmOpen}
          onClose={() => setRestoreConfirmOpen(false)}
          onConfirm={handleRestoreConfirmOk}
          title={<BelarusianText belarusian="Загрузіць копію?" russian="Загрузить копию?" />}
          message={
            <BelarusianText
              belarusian={isAdmin ? RESTORE_WARNING_ADMIN.belarusian : RESTORE_WARNING_TEACHER.belarusian}
              russian={isAdmin ? RESTORE_WARNING_ADMIN.russian : RESTORE_WARNING_TEACHER.russian}
            />
          }
          confirmText={<BelarusianText belarusian="Так, выбраць файл" russian="Да, выбрать файл" />}
          confirmColor="primary"
        />

        <Outlet context={{ authenticatedFetch, isAdmin, isTeacher }} />
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ '& .MuiAlert-message': { whiteSpace: 'pre-line' } }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

