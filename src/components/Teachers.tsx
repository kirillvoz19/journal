import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { BelarusianText } from './BelarusianText'
import { ConfirmDialog } from './ConfirmDialog'

interface Teacher {
  id: number
  username: string
  fullName: string
  createdAt?: string
}

interface TeachersProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

type SortField = 'fullName' | 'username'
type SortOrder = 'asc' | 'desc'

// Генерирует надежный 6-значный пароль
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const Teachers: React.FC<TeachersProps> = ({
  authenticatedFetch,
}) => {
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
  // Хранилище паролей в памяти (по ID преподавателя)
  const [teacherPasswords, setTeacherPasswords] = useState<Map<number, string>>(
    new Map()
  )

  // Форма добавления
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newFullName, setNewFullName] = useState('')

  // Форма редактирования
  const [editPassword, setEditPassword] = useState('')
  const [editFullName, setEditFullName] = useState('')

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
    setSnackbar({ ...snackbar, open: false })
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  useEffect(() => {
    if (openAddDialog) {
      setNewPassword(generatePassword())
    }
  }, [openAddDialog])

  const fetchTeachers = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/teachers')
      if (response.ok) {
        const data = (await response.json()) as Teacher[]
        setTeachers(data)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeacher = async () => {
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      return
    }

    try {
      const response = await authenticatedFetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          fullName: newFullName,
        }),
      })

      if (response.ok) {
        const newTeacher = (await response.json()) as Teacher
        // Сохраняем пароль нового преподавателя
        setTeacherPasswords((prev) => {
          const newMap = new Map(prev)
          newMap.set(newTeacher.id, newPassword)
          return newMap
        })
        setOpenAddDialog(false)
        setNewUsername('')
        setNewPassword('')
        setNewFullName('')
        fetchTeachers()
        showSnackbar(
          'Выкладчык паспяхова дададзены',
          'success'
        )
      } else {
        const error = (await response.json()) as { error: string }
        showSnackbar(
          error.error || 'Памылка пры даданні выкладчыка',
          'error'
        )
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      showSnackbar('Памылка пры даданні выкладчыка', 'error')
    }
  }

  const handleEditTeacher = async () => {
    if (!editingTeacher) return
    if (!editPassword.trim() && !editFullName.trim()) {
      return
    }

    try {
      const updateData: any = { id: editingTeacher.id }
      // Обновляем пароль только если он был изменен (не пустой)
      if (editPassword.trim()) {
        updateData.password = editPassword
      }
      if (editFullName.trim()) {
        updateData.fullName = editFullName
      }

      const response = await authenticatedFetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        // Сохраняем пароль, если он был указан
        if (editingTeacher && editPassword.trim()) {
          setTeacherPasswords((prev) => {
            const newMap = new Map(prev)
            newMap.set(editingTeacher.id, editPassword)
            return newMap
          })
        }
        setOpenEditDialog(false)
        setEditingTeacher(null)
        setEditPassword('')
        setEditFullName('')
        fetchTeachers()
        showSnackbar(
          'Выкладчык паспяхова адрэдагаваны',
          'success'
        )
      } else {
        const error = (await response.json()) as { error: string }
        showSnackbar(
          error.error || 'Памылка пры рэдагаванні выкладчыка',
          'error'
        )
      }
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
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        // Удаляем пароль из хранилища
        setTeacherPasswords((prev) => {
          const newMap = new Map(prev)
          newMap.delete(teacherToDelete.id)
          return newMap
        })
        setShowDeleteConfirm(false)
        setTeacherToDelete(null)
        fetchTeachers()
        showSnackbar(
          'Выкладчык паспяхова выдалены',
          'error'
        )
      } else {
        const error = (await response.json()) as { error: string }
        showSnackbar(
          error.error || 'Памылка пры выдаленні выкладчыка',
          'error'
        )
      }
    } catch (error) {
      console.error('Error deleting teacher:', error)
      showSnackbar('Памылка пры выдаленні выкладчыка', 'error')
    }
  }

  const handleOpenEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditFullName(teacher.fullName)
    // Показываем настоящий пароль, если он сохранен, иначе пустое поле
    const savedPassword = teacherPasswords.get(teacher.id)
    setEditPassword(savedPassword || '')
    setOpenEditDialog(true)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  // Фильтрация и сортировка
  const filteredAndSortedTeachers = useMemo(() => {
    let filtered = teachers.filter(
      (teacher) =>
        teacher.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    filtered.sort((a, b) => {
      let aValue: string
      let bValue: string

      if (sortField === 'fullName') {
        aValue = a.fullName.toLowerCase()
        bValue = b.fullName.toLowerCase()
      } else {
        aValue = a.username.toLowerCase()
        bValue = b.username.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

    return filtered
  }, [teachers, searchQuery, sortField, sortOrder])

  return (
    <Box sx={{ p: 3 }}>
      {/* Первая строка: кнопка добавления, селектор, иконка сортировки, поиск */}
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

        <Tooltip title={sortOrder === 'asc' ? 'Сартыраваць па ўзрастанні' : 'Сартыраваць па змяншэнні'}>
          <IconButton onClick={toggleSortOrder} color="primary">
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

      {/* Таблица */}
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
                  <BelarusianText belarusian="Загрузка..." russian="Загрузка..." />
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
                      size="small"
                      onClick={() => handleOpenEditDialog(teacher)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
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

      {/* Диалог добавления */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>
          <BelarusianText
            belarusian="Дадаць выкладчыка"
            russian="Добавить преподавателя"
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Tooltip title="Логин" arrow>
              <TextField
                label="Лагін"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                fullWidth
                required
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
          <Button onClick={() => setOpenAddDialog(false)}>
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

      {/* Диалог редактирования */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
      >
        <DialogTitle>
          <BelarusianText
            belarusian="Рэдагаваць выкладчыка"
            russian="Редактировать преподавателя"
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Tooltip title="Логин" arrow>
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
            <Tooltip title="Пароль" arrow>
              <TextField
                label="Пароль"
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                fullWidth
                helperText="Увядзіце новы пароль або пакіньце без змяненняў"
              />
            </Tooltip>
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
          <Button onClick={() => setOpenEditDialog(false)}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleEditTeacher}
            variant="contained"
            disabled={!editFullName.trim()}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
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
        confirmText={
          <BelarusianText belarusian="Выдаліць" russian="Удалить" />
        }
        cancelText={<BelarusianText belarusian="Адмена" russian="Отмена" />}
        confirmColor="error"
      />

      {/* Тостер уведомлений */}
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
