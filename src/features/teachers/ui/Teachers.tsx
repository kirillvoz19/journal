import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { BelarusianText } from '../../../components/BelarusianText'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import type { Teacher, UpdateTeacherRequest } from '../../../entities/teacher/model/types'
import {
  getTeacherPassword,
  readTeacherPasswordsFromStorage,
  removeTeacherPassword,
  upsertTeacherPassword,
  writeTeacherPasswordsToStorage,
  type TeacherPasswordsByTeacherId,
} from '../../../shared/lib/storage/teacherPasswords'
import { DialogTitleWithClose } from '../../../shared/ui/dialog-title-with-close'

interface TeachersProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
  isAdmin?: boolean
}

type SortField = 'fullName' | 'username'
type SortOrder = 'asc' | 'desc'

const LOGIN_ONLY_LATIN_HELPER_BY =
  'Лагін можна ствараць толькі лацінскімі літарамі (A–Z, a–z, 0–9).'
const LOGIN_ONLY_LATIN_HELPER_RU =
  'Логин можно создавать только латинскими буквами (A–Z, a–z, 0–9).'
const LOGIN_INVALID_CHAR_TOAST_BY =
  'Дазволены толькі лацінскія літары, лічбы і знак падкрэслівання.'
const LOGIN_INVALID_CHAR_TOAST_RU =
  'Допускаются только латинские буквы, цифры и знак подчёркивания.'

// Генерирует надежный 6-символьный пароль (без похожих символов)
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const Teachers: React.FC<TeachersProps> = ({ authenticatedFetch, isAdmin }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [sortField, setSortField] = useState<SortField>('fullName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)

  // Постоянное хранилище паролей (по ID преподавателя) в localStorage
  const [teacherPasswords, setTeacherPasswords] =
    useState<TeacherPasswordsByTeacherId>(() => readTeacherPasswordsFromStorage())

  // Форма добавления
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')

  // Форма редактирования: для админа пароль подгружается с бэка (расшифровка), иначе из кэша (только что созданный)
  const [editPassword, setEditPassword] = useState('')
  const [initialEditPassword, setInitialEditPassword] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editPasswordLoading, setEditPasswordLoading] = useState(false)

  // Тостеры
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const handleNewUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const filtered = raw.replace(/[^a-zA-Z0-9_]/g, '')
    if (filtered !== raw) {
      showSnackbar(
        `${LOGIN_INVALID_CHAR_TOAST_BY}\n\n${LOGIN_INVALID_CHAR_TOAST_RU}`,
        'error'
      )
    }
    setNewUsername(filtered)
  }

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false)
  }

  useEffect(() => {
    writeTeacherPasswordsToStorage(teacherPasswords)
  }, [teacherPasswords])

  useEffect(() => {
    void fetchTeachers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!openAddDialog) return
    setNewPassword(generatePassword())
  }, [openAddDialog])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/teachers')
      if (!response.ok) return

      const data = (await response.json()) as Teacher[]
      setTeachers(data)
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeacher = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) return

    try {
      const response = await authenticatedFetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          fullName: newFullName.trim(),
        }),
      })

      if (response.ok) {
        const createdTeacher = (await response.json()) as Teacher

        setTeacherPasswords((prev) =>
          upsertTeacherPassword(prev, createdTeacher.id, newPassword)
        )

        setOpenAddDialog(false)
        setNewUsername('')
        setNewPassword('')
        setNewFullName('')
        await fetchTeachers()
        showSnackbar('Выкладчык паспяхова дададзены', 'success')
        return
      }

      const errorBody = (await response.json()) as { error?: string }
      showSnackbar(
        errorBody.error || 'Памылка пры даданні выкладчыка',
        'error'
      )
    } catch (error) {
      console.error('Error adding teacher:', error)
      showSnackbar('Памылка пры даданні выкладчыка', 'error')
    }
  }

  const handleEditTeacher = async () => {
    if (!editingTeacher) return

    const nextFullName = editFullName.trim()
    const nextPassword = editPassword.trim()

    const didFullNameChange = nextFullName !== editingTeacher.fullName
    const didPasswordChange =
      nextPassword.length > 0 && nextPassword !== initialEditPassword

    if (!didFullNameChange && !didPasswordChange) return

    try {
      const updateData: UpdateTeacherRequest = { id: editingTeacher.id }

      if (didPasswordChange) {
        updateData.password = nextPassword
      }

      if (didFullNameChange) {
        updateData.fullName = nextFullName
      }

      const response = await authenticatedFetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        if (didPasswordChange) {
          setTeacherPasswords((prev) =>
            upsertTeacherPassword(prev, editingTeacher.id, nextPassword)
          )
        }

        setOpenEditDialog(false)
        setEditingTeacher(null)
        setEditPassword('')
        setInitialEditPassword('')
        setEditFullName('')
        await fetchTeachers()
        showSnackbar('Выкладчык паспяхова адрэдагаваны', 'success')
        return
      }

      const errorBody = (await response.json()) as { error?: string }
      showSnackbar(
        errorBody.error || 'Памылка пры рэдагаванні выкладчыка',
        'error'
      )
    } catch (error) {
      console.error('Error updating teacher:', error)
      showSnackbar('Памылка пры рэдагаванні выкладчыка', 'error')
    }
  }

  const handleDeleteClick = (teacher: Teacher) => {
    setTeacherToDelete(teacher)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return

    try {
      const response = await authenticatedFetch(
        `/api/teachers?id=${teacherToDelete.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setTeacherPasswords((prev) =>
          removeTeacherPassword(prev, teacherToDelete.id)
        )

        setShowDeleteConfirm(false)
        setTeacherToDelete(null)
        await fetchTeachers()
        showSnackbar('Выкладчык паспяхова выдалены', 'error')
        return
      }

      const errorBody = (await response.json()) as { error?: string }
      showSnackbar(errorBody.error || 'Памылка пры выдаленні выкладчыка', 'error')
    } catch (error) {
      console.error('Error deleting teacher:', error)
      showSnackbar('Памылка пры выдаленні выкладчыка', 'error')
    }
  }

  const handleOpenEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditFullName(teacher.fullName)
    const fromCache = getTeacherPassword(teacherPasswords, teacher.id)
    setEditPassword(fromCache ?? '')
    setInitialEditPassword(fromCache ?? '')
    setOpenEditDialog(true)
  }

  // Для админа при открытии редактирования запрашиваем расшифрованный пароль с бэка (работает на любом устройстве)
  useEffect(() => {
    if (!openEditDialog || !editingTeacher || !isAdmin) return
    const tid = editingTeacher.id
    let cancelled = false
    setEditPasswordLoading(true)
    authenticatedFetch(`/api/teachers/${tid}/password`)
      .then((res) => (res.ok ? (res.json() as Promise<{ password?: string }>) : null))
      .then((data) => {
        if (cancelled || !data) return
        const p = data.password ?? ''
        setEditPassword(p)
        setInitialEditPassword(p)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEditPasswordLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [openEditDialog, editingTeacher?.id, isAdmin, authenticatedFetch])

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false)
    setEditingTeacher(null)
    setEditPassword('')
    setInitialEditPassword('')
    setEditFullName('')
  }

  const editFormHasChanges = editingTeacher
    ? editFullName.trim() !== editingTeacher.fullName ||
      (editPassword.trim().length > 0 && editPassword.trim() !== initialEditPassword)
    : false

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const filteredAndSortedTeachers = useMemo(() => {
    const filtered = teachers.filter((teacher) => {
      const query = searchQuery.toLowerCase()
      return (
        teacher.username.toLowerCase().includes(query) ||
        teacher.fullName.toLowerCase().includes(query)
      )
    })

    filtered.sort((a, b) => {
      const aValue =
        sortField === 'fullName'
          ? a.fullName.toLowerCase()
          : a.username.toLowerCase()
      const bValue =
        sortField === 'fullName'
          ? b.fullName.toLowerCase()
          : b.username.toLowerCase()

      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    })

    return filtered
  }, [teachers, searchQuery, sortField, sortOrder])

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Tooltip title="Дадаць новага выкладчыка">
          <IconButton
            aria-label="Дадаць выкладчыка"
            color="primary"
            onClick={() => setOpenAddDialog(true)}
            sx={{ border: '1px solid', borderColor: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sort-label">Сартыроўка</InputLabel>
          <Select
            labelId="sort-label"
            value={sortField}
            label="Сартыроўка"
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <MenuItem value="fullName">
              <BelarusianText belarusian="Па ПІБ" russian="По ФИО" />
            </MenuItem>
            <MenuItem value="username">
              <BelarusianText belarusian="Па лагіне" russian="По логину" />
            </MenuItem>
          </Select>
        </FormControl>

        <Tooltip
          title={
            sortOrder === 'asc'
              ? 'Сартыраваць па ўзрастанні'
              : 'Сартыраваць па змяншэнні'
          }
        >
          <IconButton
            aria-label="Змяніць парадак сартавання"
            onClick={toggleSortOrder}
            color="primary"
          >
            {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Поиск по логину или ФИО" arrow>
          <TextField
            size="small"
            placeholder="Пошук па лагіне або ПІБ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <BelarusianText belarusian="Нумар" russian="Номер" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="Лагін" russian="Логин" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="ПІБ" russian="ФИО" />
              </TableCell>
              <TableCell align="right">
                <BelarusianText belarusian="Дзеянні" russian="Действия" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <BelarusianText
                    belarusian="Загрузка..."
                    russian="Загрузка..."
                  />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <BelarusianText
                    belarusian="Выкладчыкі не знойдзены"
                    russian="Преподаватели не найдены"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTeachers.map((teacher, index) => (
                <TableRow key={teacher.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{teacher.username}</TableCell>
                  <TableCell>{teacher.fullName}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label="Рэдагаваць выкладчыка"
                      size="small"
                      onClick={() => handleOpenEditDialog(teacher)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="Выдаліць выкладчыка"
                      size="small"
                      onClick={() => handleDeleteClick(teacher)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openAddDialog}
        onClose={handleCloseAddDialog}
        aria-labelledby="add-teacher-title"
      >
        <DialogTitleWithClose id="add-teacher-title" onClose={handleCloseAddDialog}>
          <BelarusianText
            belarusian="Дадаць выкладчыка"
            russian="Добавить преподавателя"
          />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Tooltip title={LOGIN_ONLY_LATIN_HELPER_RU} arrow>
              <TextField
                label="Лагін"
                value={newUsername}
                onChange={handleNewUsernameChange}
                fullWidth
                required
                helperText={LOGIN_ONLY_LATIN_HELPER_BY}
              />
            </Tooltip>
            <Tooltip title="Пароль" arrow>
              <TextField
                label="Пароль"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
              />
            </Tooltip>
            <Tooltip title="ФИО" arrow>
              <TextField
                label="ПІБ"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                fullWidth
                required
              />
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleAddTeacher}
            variant="contained"
            disabled={
              !newUsername.trim() || !newPassword.trim() || !newFullName.trim()
            }
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        aria-labelledby="edit-teacher-title"
      >
        <DialogTitleWithClose id="edit-teacher-title" onClose={handleCloseEditDialog}>
          <BelarusianText
            belarusian="Рэдагаваць выкладчыка"
            russian="Редактировать преподавателя"
          />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Tooltip title={LOGIN_ONLY_LATIN_HELPER_RU} arrow>
              <TextField
                label="Лагін"
                value={editingTeacher?.username || ''}
                disabled
                fullWidth
                sx={{
                  '& .MuiInputBase-root.Mui-disabled': {
                    backgroundColor: 'transparent',
                  },
                }}
              />
            </Tooltip>
            <TextField
              label="Пароль"
              type="text"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              fullWidth
              disabled={editPasswordLoading}
              helperText={editPasswordLoading ? 'Загрузка пароля…' : undefined}
              placeholder="Пусто — не менять"
            />
            <Tooltip title="ФИО" arrow>
              <TextField
                label="ПІБ"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                fullWidth
                required
              />
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleEditTeacher}
            variant="contained"
            disabled={!editFullName.trim() || !editFormHasChanges}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setTeacherToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={
          <BelarusianText
            belarusian="Выдаліць выкладчыка?"
            russian="Удалить преподавателя?"
          />
        }
        message={
          teacherToDelete
            ? `Вы сапраўды хочаце выдаліць выкладчыка?\n\nЛагін: ${teacherToDelete.username}\nПІБ: ${teacherToDelete.fullName}`
            : ''
        }
        confirmText={<BelarusianText belarusian="Выдаліць" russian="Удалить" />}
        cancelText={<BelarusianText belarusian="Адмена" russian="Отмена" />}
        confirmColor="error"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            '& .MuiAlert-message': { whiteSpace: 'pre-line' },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

