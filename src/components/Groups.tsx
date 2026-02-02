import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Snackbar,
  Alert,
  Chip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/ru'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// Настройка dayjs для 24-часового формата
dayjs.extend(customParseFormat)
dayjs.locale('ru')
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { BelarusianText } from './BelarusianText'
import { ConfirmDialog } from './ConfirmDialog'
import { DialogTitleWithClose } from '../shared/ui/dialog-title-with-close'
import type {
  AttendanceEditStatus,
  AttendanceStatus,
  Group,
  GroupSchedule,
  GroupStudent,
  Teacher,
} from '../features/groups/model/types'
import {
  deleteAttendanceRecords,
  loadAttendanceMapForGroup,
  makeAttendanceKeyFromEntities,
  saveAttendanceRecords,
} from '../features/groups/model/attendance'

type SortField = 'default' | 'level' | 'teacher' | 'subject' | 'name'
type SortOrder = 'asc' | 'desc'

interface GroupsProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const SUBJECTS = ['Немецкий', 'Английский', 'Польский', 'Другой язык']
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const Groups: React.FC<GroupsProps> = ({ authenticatedFetch }) => {
  const [groups, setGroups] = useState<Group[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField>('default')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)

  // Форма групы
  const [groupName, setGroupName] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [schedules, setSchedules] = useState<GroupSchedule[]>([])
  const [students, setStudents] = useState<GroupStudent[]>([])

  // Модальные окна
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false)
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null)
  const [scheduleDate, setScheduleDate] = useState<Dayjs | null>(null)
  const [scheduleStartTime, setScheduleStartTime] = useState<Dayjs | null>(null)
  const [scheduleEndTime, setScheduleEndTime] = useState<Dayjs | null>(null)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false)
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false)

  const [openStudentDialog, setOpenStudentDialog] = useState(false)
  const [editingStudentIndex, setEditingStudentIndex] = useState<number | null>(null)
  const [studentFullName, setStudentFullName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')

  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false)
  const [attendanceStudent, setAttendanceStudent] = useState<GroupStudent | null>(null)
  const [attendanceSchedule, setAttendanceSchedule] = useState<GroupSchedule | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceEditStatus>('unset')
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceStatus>>(new Map())
  const [unsetAttendanceKeys, setUnsetAttendanceKeys] = useState<Set<string>>(() => new Set())

  const [openDeleteScheduleConfirm, setOpenDeleteScheduleConfirm] = useState(false)
  const [scheduleToDeleteIndex, setScheduleToDeleteIndex] = useState<number | null>(null)

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

  useEffect(() => {
    fetchTeachers()
    fetchGroups()
  }, [])

  const enrichGroupWithTeacher = (group: Group): Group => {
    const teacher = teachers.find((t) => t.id === group.teacherId)
    return {
      ...group,
      teacherFullName: teacher?.fullName || '',
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await authenticatedFetch('/api/teachers')
      if (response.ok) {
        const data = (await response.json()) as Teacher[]
        setTeachers(data)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
    }
  }

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/groups')
      if (response.ok) {
        const data = (await response.json()) as Group[]
        // Обогащаем группы данными о преподавателях
        const enrichedGroups = data.map((group) => {
          const teacher = teachers.find((t) => t.id === group.teacherId)
          return {
            ...group,
            teacherFullName: teacher?.fullName || '',
          }
        })
        setGroups(enrichedGroups)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обновляем группы при изменении списка преподавателей
  useEffect(() => {
    if (teachers.length > 0 && groups.length > 0) {
      const enrichedGroups = groups.map((group) => {
        const teacher = teachers.find((t) => t.id === group.teacherId)
        return {
          ...group,
          teacherFullName: teacher?.fullName || '',
        }
      })
      setGroups(enrichedGroups)
    }
  }, [teachers])

  const fetchGroupById = async (groupId: number): Promise<Group | null> => {
    const response = await authenticatedFetch('/api/groups')
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as Group[]
    const found = data.find((g) => g.id === groupId)
    return found ? enrichGroupWithTeacher(found) : null
  }

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const resetForm = () => {
    setGroupName('')
    setSelectedTeacherId('')
    setSelectedSubject('')
    setCustomSubject('')
    setSelectedLevel('')
    setSchedules([])
    setStudents([])
    setAttendanceMap(new Map())
    setUnsetAttendanceKeys(new Set())
  }

  const handleOpenAddDialog = async () => {
    // Обновляем список преподавателей перед открытием диалога
    await fetchTeachers()
    setOpenAddDialog(true)
    // Данные НЕ сбрасываются - они сохраняются в состоянии компонента
  }

  const handleCloseAddDialog = () => {
    // При закрытии модалки (клик вне или ESC) данные сохраняются в состоянии
    setOpenAddDialog(false)
  }

  const handleCloseScheduleDialog = () => {
    setOpenScheduleDialog(false)
  }

  const handleCloseStudentDialog = () => {
    setOpenStudentDialog(false)
  }

  const handleCloseAttendanceDialog = () => {
    setOpenAttendanceDialog(false)
  }

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false)
    setEditingGroup(null)
  }

  const handleCancelAddDialog = () => {
    // Пры націску "Адмена" даныя скідваюцца
    resetForm()
    setOpenAddDialog(false)
  }

  const handleAddSchedule = () => {
    setEditingScheduleIndex(null)
    setScheduleDate(null)
    setScheduleStartTime(null)
    setScheduleEndTime(null)
    setDatePickerOpen(false)
    setStartTimePickerOpen(false)
    setEndTimePickerOpen(false)
    setOpenScheduleDialog(true)
  }

  const handleEditSchedule = (index: number) => {
    const schedule = schedules[index]
    setEditingScheduleIndex(index)
    setScheduleDate(dayjs(schedule.date))
    setScheduleStartTime(dayjs(schedule.startTime, 'HH:mm'))
    setScheduleEndTime(dayjs(schedule.endTime, 'HH:mm'))
    setDatePickerOpen(false)
    setStartTimePickerOpen(false)
    setEndTimePickerOpen(false)
    setOpenScheduleDialog(true)
  }

  const handleSaveSchedule = () => {
    if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      return
    }

    const newSchedule: GroupSchedule = {
      date: scheduleDate.format('YYYY-MM-DD'),
      startTime: scheduleStartTime.format('HH:mm'),
      endTime: scheduleEndTime.format('HH:mm'),
    }

    if (editingScheduleIndex !== null) {
      const updated = [...schedules]
      updated[editingScheduleIndex] = newSchedule
      setSchedules(updated)
    } else {
      setSchedules([...schedules, newSchedule])
    }

    setOpenScheduleDialog(false)
  }

  const handleDeleteSchedule = (index: number) => {
    setScheduleToDeleteIndex(index)
    setOpenDeleteScheduleConfirm(true)
  }

  const handleConfirmDeleteSchedule = () => {
    if (scheduleToDeleteIndex !== null) {
      const updated = schedules.filter((_, i) => i !== scheduleToDeleteIndex)
      setSchedules(updated)
    }
    setOpenDeleteScheduleConfirm(false)
    setScheduleToDeleteIndex(null)
  }

  const handleAddStudent = () => {
    setEditingStudentIndex(null)
    setStudentFullName('')
    setStudentEmail('')
    setStudentPhone('')
    setOpenStudentDialog(true)
  }

  const handleEditStudent = (index: number) => {
    const student = students[index]
    setEditingStudentIndex(index)
    setStudentFullName(student.fullName)
    setStudentEmail(student.email || '')
    setStudentPhone(student.phone || '')
    setOpenStudentDialog(true)
  }

  const handleSaveStudent = () => {
    if (!studentFullName.trim()) {
      return
    }

    const newStudent: GroupStudent = {
      fullName: studentFullName.trim(),
      email: studentEmail.trim() || undefined,
      phone: studentPhone.trim() || undefined,
    }

    if (editingStudentIndex !== null) {
      const updated = [...students]
      updated[editingStudentIndex] = newStudent
      setStudents(updated)
    } else {
      setStudents([...students, newStudent])
    }

    setOpenStudentDialog(false)
  }

  const handleDeleteStudent = (index: number) => {
    const updated = students.filter((_, i) => i !== index)
    setStudents(updated)
  }

  const handleOpenAttendanceDialog = (student: GroupStudent, schedule: GroupSchedule) => {
    setAttendanceStudent(student)
    setAttendanceSchedule(schedule)
    // Load existing attendance status if available
    const key = makeAttendanceKeyFromEntities(student, schedule)
    const existingStatus: AttendanceEditStatus = attendanceMap.get(key) ?? 'unset'
    setAttendanceStatus(existingStatus)
    setOpenAttendanceDialog(true)
  }

  const handleSaveAttendance = () => {
    if (!attendanceStudent || !attendanceSchedule) {
      return
    }
    const key = makeAttendanceKeyFromEntities(attendanceStudent, attendanceSchedule)
    if (attendanceStatus === 'unset') {
      setAttendanceMap((prev) => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
      setUnsetAttendanceKeys((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      setOpenAttendanceDialog(false)
      return
    }

    setAttendanceMap((prev) => {
      const next = new Map(prev)
      next.set(key, attendanceStatus)
      return next
    })
    setUnsetAttendanceKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    setOpenAttendanceDialog(false)
  }

  const getAttendanceStatus = (student: GroupStudent, schedule: GroupSchedule): AttendanceStatus | null => {
    const key = makeAttendanceKeyFromEntities(student, schedule)
    return attendanceMap.get(key) ?? null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU')
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5) // HH:mm format
  }

  const handleSaveGroup = async () => {
    if (!groupName.trim() || !selectedTeacherId || !selectedSubject || !selectedLevel) {
      return
    }

    try {
      setLoading(true)
      
      // Save group first to get IDs
      const groupResponse = await authenticatedFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          teacherId: selectedTeacherId,
          subject: selectedSubject,
          customSubject: selectedSubject === 'Другой язык' ? customSubject.trim() : undefined,
          level: selectedLevel,
          schedules: schedules,
          students: students,
        }),
      })

      if (!groupResponse.ok) {
        const error = (await groupResponse.json()) as { error: string }
        showSnackbar(error.error || 'Памылка пры даданні групы', 'error')
        return
      }

      const savedGroup = (await groupResponse.json()) as Group
      
      // Save attendance records
      await saveAttendanceRecords({
        authenticatedFetch,
        group: savedGroup,
        attendanceMap,
      })
      await deleteAttendanceRecords({
        authenticatedFetch,
        group: savedGroup,
        unsetAttendanceKeys,
      })

      setGroups((prev) => [...prev, enrichGroupWithTeacher(savedGroup)])
      setOpenAddDialog(false)
      resetForm()
      setAttendanceMap(new Map())
      setUnsetAttendanceKeys(new Set())
      showSnackbar('Група паспяхова дададзена', 'success')
      fetchGroups()
    } catch {
      console.error('Error saving group')
      showSnackbar('Памылка пры даданні групы', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditDialog = async (group: Group) => {
    try {
      setLoading(true)
      await fetchTeachers()

      const groupId = group.id
      const freshGroup = typeof groupId === 'number' ? await fetchGroupById(groupId) : null
      const groupToEdit = freshGroup ?? group

      setEditingGroup(groupToEdit)
      setGroupName(groupToEdit.name)
      setSelectedTeacherId(groupToEdit.teacherId)
      setSelectedSubject(groupToEdit.subject)
      setCustomSubject(groupToEdit.customSubject || '')
      setSelectedLevel(groupToEdit.level)
      setSchedules(groupToEdit.schedules || [])
      setStudents(groupToEdit.students || [])
      setAttendanceMap(new Map())
      setUnsetAttendanceKeys(new Set())
      setOpenEditDialog(true)

      const loadedMap = await loadAttendanceMapForGroup({ authenticatedFetch, group: groupToEdit })
      setAttendanceMap(loadedMap)
    } catch {
      console.error('Error opening edit dialog')
      setOpenEditDialog(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEditGroup = async () => {
    if (!editingGroup || !groupName.trim() || !selectedTeacherId || !selectedSubject || !selectedLevel) {
      return
    }

    try {
      setLoading(true)
      
      const groupResponse = await authenticatedFetch('/api/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGroup.id,
          name: groupName.trim(),
          teacherId: selectedTeacherId,
          subject: selectedSubject,
          customSubject: selectedSubject === 'Другой язык' ? customSubject.trim() : undefined,
          level: selectedLevel,
          schedules: schedules,
          students: students,
        }),
      })

      if (!groupResponse.ok) {
        const error = (await groupResponse.json()) as { error: string }
        showSnackbar(error.error || 'Памылка пры рэдагаванні групы', 'error')
        return
      }

      const savedGroup = (await groupResponse.json()) as Group

      await saveAttendanceRecords({
        authenticatedFetch,
        group: savedGroup,
        attendanceMap,
      })
      await deleteAttendanceRecords({
        authenticatedFetch,
        group: savedGroup,
        unsetAttendanceKeys,
      })

      setGroups((prev) =>
        prev.map((g) => (g.id === savedGroup.id ? enrichGroupWithTeacher(savedGroup) : g))
      )
      setOpenEditDialog(false)
      setEditingGroup(null)
      resetForm()
      setAttendanceMap(new Map())
      setUnsetAttendanceKeys(new Set())
      showSnackbar('Група паспяхова адрэдагавана', 'success')
      fetchGroups()
    } catch {
      console.error('Error updating group')
      showSnackbar('Памылка пры рэдагаванні групы', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return

    try {
      const response = await authenticatedFetch(
        `/api/groups?id=${groupToDelete.id}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setShowDeleteConfirm(false)
        setGroupToDelete(null)
        fetchGroups()
        showSnackbar('Група паспяхова выдалена', 'error')
      } else {
        const error = (await response.json()) as { error: string }
        showSnackbar(error.error || 'Памылка пры выдаленні групы', 'error')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      showSnackbar('Памылка пры выдаленні групы', 'error')
    }
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const getSubjectDisplay = (group: Group) => {
    return group.subject === 'Другой язык' ? (group.customSubject || group.subject) : group.subject
  }

  // Фильтрация и сортировка
  const filteredAndSortedGroups = React.useMemo(() => {
    let filtered = groups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (group.teacherFullName && group.teacherFullName.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      if (sortField === 'default') {
        // Сортировка по времени создания
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0
        aValue = aDate
        bValue = bDate
      } else if (sortField === 'level') {
        const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
        aValue = levelOrder.indexOf(a.level)
        bValue = levelOrder.indexOf(b.level)
      } else if (sortField === 'teacher') {
        aValue = (a.teacherFullName || '').toLowerCase()
        bValue = (b.teacherFullName || '').toLowerCase()
      } else if (sortField === 'subject') {
        aValue = getSubjectDisplay(a).toLowerCase()
        bValue = getSubjectDisplay(b).toLowerCase()
      } else {
        // name
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue)
        } else {
          return bValue.localeCompare(aValue)
        }
      } else {
        if (sortOrder === 'asc') {
          return (aValue as number) - (bValue as number)
        } else {
          return (bValue as number) - (aValue as number)
        }
      }
    })

    return filtered
  }, [groups, searchQuery, sortField, sortOrder])

  const isFormValid = () => {
    return !!(
      groupName.trim() &&
      selectedTeacherId &&
      selectedSubject &&
      selectedLevel
    )
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
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
        <Tooltip title="Дадаць новую групу">
          <IconButton
            color="primary"
            onClick={handleOpenAddDialog}
            sx={{ border: '1px solid', borderColor: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="sort-label">Сартыроўка</InputLabel>
          <Select
            labelId="sort-label"
            value={sortField}
            label="Сартыроўка"
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <MenuItem value="default">
              <BelarusianText belarusian="Па змаўчанні" russian="По умолчанию" />
            </MenuItem>
            <MenuItem value="level">
              <BelarusianText belarusian="Па ўзроўню" russian="По уровню" />
            </MenuItem>
            <MenuItem value="teacher">
              <BelarusianText belarusian="Па выкладчыку" russian="По преподавателю" />
            </MenuItem>
            <MenuItem value="subject">
              <BelarusianText belarusian="Па прадмеце" russian="По предмету" />
            </MenuItem>
            <MenuItem value="name">
              <BelarusianText belarusian="Па назве групы" russian="По названию группы" />
            </MenuItem>
          </Select>
        </FormControl>

        <Tooltip title={sortOrder === 'asc' ? 'Сартыраваць па ўзрастанні' : 'Сартыраваць па змяншэнні'}>
          <IconButton onClick={toggleSortOrder} color="primary">
            {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Поиск по названию группы или преподавателю" arrow>
          <TextField
            size="small"
            placeholder="Пошук па назве групы або выкладчыку"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
        </Tooltip>
      </Box>

      {/* Таблица групп */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <BelarusianText belarusian="Нумар" russian="Номер" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="Назва групы" russian="Название группы" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="Прадмет" russian="Предмет" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="Узровень" russian="Уровень" />
              </TableCell>
              <TableCell>
                <BelarusianText belarusian="Выкладчык" russian="Преподаватель" />
              </TableCell>
              <TableCell align="right">
                <BelarusianText belarusian="Дзеянні" russian="Действия" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <BelarusianText belarusian="Загрузка..." russian="Загрузка..." />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <BelarusianText
                    belarusian="Групы не знойдзены"
                    russian="Группы не найдены"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedGroups.map((group, index) => (
                <TableRow key={group.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{getSubjectDisplay(group)}</TableCell>
                  <TableCell>{group.level}</TableCell>
                  <TableCell>{group.teacherFullName || ''}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Рэдагаваць групу">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(group)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Выдаліць групу">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(group)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог добавления группы */}
      <Dialog 
        open={openAddDialog} 
        onClose={handleCloseAddDialog}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitleWithClose onClose={handleCloseAddDialog}>
          <BelarusianText belarusian="Дадаць групу" russian="Добавить группу" />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Назва"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Выкладчык</InputLabel>
              <Select
                value={selectedTeacherId}
                label="Выкладчык"
                onChange={(e) => setSelectedTeacherId(e.target.value as number)}
              >
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.username} {teacher.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Прадмет</InputLabel>
              <Select
                value={selectedSubject}
                label="Прадмет"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {SUBJECTS.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSubject === 'Другой язык' && (
              <TextField
                label="Назва прадмета"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                fullWidth
                required
              />
            )}

            <FormControl fullWidth required>
              <InputLabel>Узровень</InputLabel>
              <Select
                value={selectedLevel}
                label="Узровень"
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                {LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* График */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1">
                  <BelarusianText belarusian="Графік" russian="График" />
                </Typography>
                <Tooltip title="Дадаць занятак">
                  <IconButton size="small" color="primary" onClick={handleAddSchedule}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {schedules.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  <BelarusianText
                    belarusian="Графік не дададзены"
                    russian="График не добавлен"
                  />
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {schedules.map((schedule, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {formatDate(schedule.date)} {formatTime(schedule.startTime)} -{' '}
                        {formatTime(schedule.endTime)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleEditSchedule(index)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSchedule(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Студенты */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1">
                  <BelarusianText belarusian="Студенты" russian="Студенты" />
                </Typography>
                <Tooltip title="Дадаць студента">
                  <IconButton size="small" color="primary" onClick={handleAddStudent}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {students.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  <BelarusianText
                    belarusian="Студэнты не дададзены"
                    russian="Студенты не добавлены"
                  />
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {students.map((student, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: schedules.length > 0 ? 1 : 0 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {student.fullName}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStudent(index)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStudent(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {/* Квадратики посещаемости под каждой датой */}
                      {schedules.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {schedules.map((schedule, scheduleIndex) => {
                            const status = getAttendanceStatus(student, schedule)
                            return (
                              <Chip
                                key={scheduleIndex}
                                label={formatDate(schedule.date)}
                                size="small"
                                onClick={() => handleOpenAttendanceDialog(student, schedule)}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: status === 'absent' ? 'orange' : status === 'present' ? 'green' : 'grey.300',
                                  color: status ? 'white' : 'inherit',
                                  '&:hover': {
                                    backgroundColor: status === 'absent' ? 'orange' : status === 'present' ? 'green' : 'grey.400',
                                    opacity: 0.8,
                                  },
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAddDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleSaveGroup}
            variant="contained"
            disabled={!isFormValid() || loading}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления/редактирования занятия */}
      <Dialog
        open={openScheduleDialog}
        onClose={handleCloseScheduleDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitleWithClose onClose={handleCloseScheduleDialog}>
          <BelarusianText
            belarusian={editingScheduleIndex !== null ? 'Рэдагаваць занятак' : 'Дадаць занятак'}
            russian={editingScheduleIndex !== null ? 'Редактировать занятие' : 'Добавить занятие'}
          />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <DatePicker
              label="Дата"
              value={scheduleDate}
              onChange={(newValue) => setScheduleDate(newValue)}
              open={datePickerOpen}
              onOpen={() => setDatePickerOpen(true)}
              onClose={() => setDatePickerOpen(false)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  onClick: () => setDatePickerOpen(true),
                },
              }}
            />
            <TimePicker
              label="Час пачатку"
              value={scheduleStartTime}
              onChange={(newValue) => setScheduleStartTime(newValue)}
              open={startTimePickerOpen}
              onOpen={() => setStartTimePickerOpen(true)}
              onClose={() => setStartTimePickerOpen(false)}
              ampm={false}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  onClick: () => setStartTimePickerOpen(true),
                },
              }}
            />
            <TimePicker
              label="Час заканчэння"
              value={scheduleEndTime}
              onChange={(newValue) => setScheduleEndTime(newValue)}
              open={endTimePickerOpen}
              onOpen={() => setEndTimePickerOpen(true)}
              onClose={() => setEndTimePickerOpen(false)}
              ampm={false}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  onClick: () => setEndTimePickerOpen(true),
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScheduleDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleSaveSchedule}
            variant="contained"
            disabled={!scheduleDate || !scheduleStartTime || !scheduleEndTime}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления/редактирования студента */}
      <Dialog
        open={openStudentDialog}
        onClose={handleCloseStudentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitleWithClose onClose={handleCloseStudentDialog}>
          <BelarusianText
            belarusian={editingStudentIndex !== null ? 'Рэдагаваць студента' : 'Дадаць студента'}
            russian={editingStudentIndex !== null ? 'Редактировать студента' : 'Добавить студента'}
          />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="ПІБ"
              value={studentFullName}
              onChange={(e) => setStudentFullName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Тэлефон"
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStudentDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleSaveStudent}
            variant="contained"
            disabled={!studentFullName.trim()}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог изменения посещаемости */}
      <Dialog
        open={openAttendanceDialog}
        onClose={handleCloseAttendanceDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitleWithClose onClose={handleCloseAttendanceDialog}>
          <BelarusianText
            belarusian="Змена звестак пра наведванне"
            russian="Изменение сведений о посещаемости"
          />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {attendanceStudent && (
              <TextField
                label="ПІБ студэнта"
                value={attendanceStudent.fullName}
                disabled
                fullWidth
              />
            )}
            {attendanceSchedule && (
              <>
                <TextField
                  label="Дата"
                  value={formatDate(attendanceSchedule.date)}
                  disabled
                  fullWidth
                />
                <TextField
                  label="Час заняткаў"
                  value={`${formatTime(attendanceSchedule.startTime)} - ${formatTime(attendanceSchedule.endTime)}`}
                  disabled
                  fullWidth
                />
              </>
            )}
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={attendanceStatus}
                label="Статус"
                onChange={(e) => setAttendanceStatus(e.target.value as AttendanceEditStatus)}
              >
                <MenuItem value="unset">
                  <BelarusianText belarusian="Не ўсталявана" russian="Не установлено" />
                </MenuItem>
                <MenuItem value="present">
                  <BelarusianText belarusian="Прысутнічаў" russian="Присутствовал" />
                </MenuItem>
                <MenuItem value="absent">
                  <BelarusianText belarusian="Адсутнічаў" russian="Отсутствовал" />
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttendanceDialog}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button onClick={handleSaveAttendance} variant="contained">
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования группы */}
      <Dialog
        open={openEditDialog}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitleWithClose onClose={handleCloseEditDialog}>
          <BelarusianText belarusian="Рэдагаваць групу" russian="Редактировать группу" />
        </DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Назва"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Выкладчык</InputLabel>
              <Select
                value={selectedTeacherId}
                label="Выкладчык"
                onChange={(e) => setSelectedTeacherId(e.target.value as number)}
              >
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.username} {teacher.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Прадмет</InputLabel>
              <Select
                value={selectedSubject}
                label="Прадмет"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {SUBJECTS.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedSubject === 'Другой язык' && (
              <TextField
                label="Назва прадмета"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                fullWidth
                required
              />
            )}

            <FormControl fullWidth required>
              <InputLabel>Узровень</InputLabel>
              <Select
                value={selectedLevel}
                label="Узровень"
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                {LEVELS.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* График */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1">
                  <BelarusianText belarusian="Графік" russian="График" />
                </Typography>
                <Tooltip title="Дадаць занятак">
                  <IconButton size="small" color="primary" onClick={handleAddSchedule}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {schedules.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  <BelarusianText
                    belarusian="Графік не дададзены"
                    russian="График не добавлен"
                  />
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {schedules.map((schedule, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">
                        {formatDate(schedule.date)} {formatTime(schedule.startTime)} -{' '}
                        {formatTime(schedule.endTime)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleEditSchedule(index)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSchedule(index)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Студенты */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1">
                  <BelarusianText belarusian="Студенты" russian="Студенты" />
                </Typography>
                <Tooltip title="Дадаць студента">
                  <IconButton size="small" color="primary" onClick={handleAddStudent}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {students.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  <BelarusianText
                    belarusian="Студэнты не дададзены"
                    russian="Студенты не добавлены"
                  />
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {students.map((student, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: schedules.length > 0 ? 1 : 0 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {student.fullName}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleEditStudent(index)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteStudent(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      {/* Квадратики посещаемости под каждой датой */}
                      {schedules.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {schedules.map((schedule, scheduleIndex) => {
                            const status = getAttendanceStatus(student, schedule)
                            return (
                              <Chip
                                key={scheduleIndex}
                                label={formatDate(schedule.date)}
                                size="small"
                                onClick={() => handleOpenAttendanceDialog(student, schedule)}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: status === 'absent' ? 'orange' : status === 'present' ? 'green' : 'grey.300',
                                  color: status ? 'white' : 'inherit',
                                  '&:hover': {
                                    backgroundColor: status === 'absent' ? 'orange' : status === 'present' ? 'green' : 'grey.400',
                                    opacity: 0.8,
                                  },
                                }}
                              />
                            )
                          })}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenEditDialog(false)
            setEditingGroup(null)
          }}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button
            onClick={handleSaveEditGroup}
            variant="contained"
            disabled={!isFormValid() || loading}
          >
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>

      {/* Подтверждение удаления занятия */}
      <ConfirmDialog
        open={openDeleteScheduleConfirm}
        onClose={() => {
          setOpenDeleteScheduleConfirm(false)
          setScheduleToDeleteIndex(null)
        }}
        onConfirm={handleConfirmDeleteSchedule}
        title={
          <BelarusianText
            belarusian="Выдаліць занятак?"
            russian="Удалить занятие?"
          />
        }
        message="Вы сапраўды хочаце выдаліць гэта занятак?"
        confirmText={<BelarusianText belarusian="Выдаліць" russian="Удалить" />}
        cancelText={<BelarusianText belarusian="Адмена" russian="Отмена" />}
        confirmColor="error"
      />

      {/* Подтверждение удаления группы */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setGroupToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title={
          <BelarusianText
            belarusian="Выдаліць групу?"
            russian="Удалить группу?"
          />
        }
        message={
          groupToDelete
            ? `Вы сапраўды хочаце выдаліць групу?\n\nНазва групы: ${groupToDelete.name}`
            : ''
        }
        confirmText={<BelarusianText belarusian="Выдаліць" russian="Удалить" />}
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
    </LocalizationProvider>
  )
}
