import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ru'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { BelarusianText } from '../../../../components/BelarusianText'
import { ConfirmDialog } from '../../../../components/ConfirmDialog'
import { DialogTitleWithClose } from '../../../../shared/ui/dialog-title-with-close'
import type { Teacher } from '../../../../entities/teacher/model/types'
import {
  deleteAttendanceRecords,
  loadAttendanceMapForGroup,
  makeAttendanceKeyFromEntities,
  saveAttendanceRecords,
  type AuthenticatedFetch,
} from '../../model/attendance'
import type {
  AttendanceEditStatus,
  AttendanceStatus,
  Group,
  GroupSchedule,
  GroupStudent,
} from '../../model/types'
import { GROUP_LEVELS, GROUP_SUBJECTS } from '../../model/constants'
import {
  createGroup,
  fetchGroupById,
  fetchTeachers,
  updateGroup,
} from '../../api/groupsApi'

dayjs.extend(customParseFormat)
dayjs.locale('ru')

export type GroupFormMode = 'create' | 'edit'

export interface GroupFormProps {
  title: ReactNode
  mode: GroupFormMode
  groupId?: number
  authenticatedFetch: AuthenticatedFetch
  onDone: () => void
  onCancel: () => void
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU')
}

const formatTime = (timeString: string): string => {
  return timeString.substring(0, 5)
}

const getAttendanceStatus = (
  params: {
    student: GroupStudent
    schedule: GroupSchedule
    attendanceMap: Map<string, AttendanceStatus>
  }
): AttendanceStatus | null => {
  const { student, schedule, attendanceMap } = params
  const key = makeAttendanceKeyFromEntities(student, schedule)
  return attendanceMap.get(key) ?? null
}

const getInitialSnackbarState = (): {
  open: boolean
  message: string
  severity: 'success' | 'error'
} => ({
  open: false,
  message: '',
  severity: 'success',
})

export const GroupForm = (props: GroupFormProps) => {
  const { title, mode, groupId, authenticatedFetch, onDone, onCancel } = props

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string>('')

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  // Форма групы
  const [groupName, setGroupName] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | ''>('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [schedules, setSchedules] = useState<GroupSchedule[]>([])
  const [students, setStudents] = useState<GroupStudent[]>([])

  // Посещаемость
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceStatus>>(
    () => new Map()
  )
  const [unsetAttendanceKeys, setUnsetAttendanceKeys] = useState<Set<string>>(
    () => new Set()
  )

  // Модальные окна (внутри формы)
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
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceEditStatus>('unset')

  const [openDeleteScheduleConfirm, setOpenDeleteScheduleConfirm] = useState(false)
  const [scheduleToDeleteIndex, setScheduleToDeleteIndex] = useState<number | null>(null)

  const [snackbar, setSnackbar] = useState(getInitialSnackbarState)

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const resetForm = () => {
    setEditingGroup(null)
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

  const fillFormFromGroup = (group: Group) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setSelectedTeacherId(group.teacherId)
    setSelectedSubject(group.subject)
    setCustomSubject(group.customSubject || '')
    setSelectedLevel(group.level)
    setSchedules(group.schedules || [])
    setStudents(group.students || [])
    setAttendanceMap(new Map())
    setUnsetAttendanceKeys(new Set())
  }

  const loadInitialData = async (): Promise<void> => {
    try {
      setLoadError('')
      setLoading(true)

      const nextTeachers = await fetchTeachers({ authenticatedFetch })
      setTeachers(nextTeachers)

      if (mode === 'create') {
        return
      }

      if (typeof groupId !== 'number') {
        setLoadError('Не передан id группы для редактирования')
        return
      }

      const group = await fetchGroupById({ authenticatedFetch, groupId })
      if (!group) {
        setLoadError('Группа не найдена')
        return
      }

      fillFormFromGroup(group)

      const loadedMap = await loadAttendanceMapForGroup({
        authenticatedFetch,
        group,
      })
      setAttendanceMap(loadedMap)
    } catch (error) {
      console.error('Error loading group form data:', error)
      setLoadError('Памылка пры загрузцы дадзеных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, groupId])

  const isFormValid = (): boolean => {
    if (!groupName.trim()) return false
    if (!selectedTeacherId) return false
    if (!selectedSubject) return false
    if (!selectedLevel) return false
    if (selectedSubject === 'Другой язык' && !customSubject.trim()) return false
    return true
  }

  // Schedule handlers
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
    if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) return

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
      setSchedules((prev) => [...prev, newSchedule])
    }

    setOpenScheduleDialog(false)
  }

  const handleDeleteSchedule = (index: number) => {
    setScheduleToDeleteIndex(index)
    setOpenDeleteScheduleConfirm(true)
  }

  const handleConfirmDeleteSchedule = () => {
    if (scheduleToDeleteIndex === null) return
    setSchedules((prev) => prev.filter((_, i) => i !== scheduleToDeleteIndex))
    setOpenDeleteScheduleConfirm(false)
    setScheduleToDeleteIndex(null)
  }

  // Student handlers
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
    if (!studentFullName.trim()) return

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
      setStudents((prev) => [...prev, newStudent])
    }

    setOpenStudentDialog(false)
  }

  const handleDeleteStudent = (index: number) => {
    setStudents((prev) => prev.filter((_, i) => i !== index))
  }

  // Attendance handlers
  const handleOpenAttendanceDialog = (student: GroupStudent, schedule: GroupSchedule) => {
    setAttendanceStudent(student)
    setAttendanceSchedule(schedule)
    const key = makeAttendanceKeyFromEntities(student, schedule)
    const existingStatus: AttendanceEditStatus = attendanceMap.get(key) ?? 'unset'
    setAttendanceStatus(existingStatus)
    setOpenAttendanceDialog(true)
  }

  const handleSaveAttendance = () => {
    if (!attendanceStudent || !attendanceSchedule) return

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

  const handleSubmit = async () => {
    if (!isFormValid()) return
    if (!selectedTeacherId) return

    try {
      setLoading(true)

      const payload = {
        name: groupName.trim(),
        teacherId: selectedTeacherId,
        subject: selectedSubject,
        customSubject:
          selectedSubject === 'Другой язык' ? customSubject.trim() : undefined,
        level: selectedLevel,
        schedules,
        students,
      } satisfies Omit<Group, 'id' | 'teacherFullName' | 'createdAt'>

      if (mode === 'edit') {
        const id = editingGroup?.id ?? groupId
        if (typeof id !== 'number') {
          showSnackbar('Не атрымалася вызначыць id групы для рэдагавання', 'error')
          return
        }

        const groupResult = await updateGroup({
          authenticatedFetch,
          payload: {
            id,
            ...payload,
          },
        })

        if ('error' in groupResult) {
          showSnackbar(groupResult.error, 'error')
          return
        }

        const savedGroup = groupResult.group

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

        showSnackbar('Група паспяхова адрэдагавана', 'success')
        resetForm()
        onDone()
        return
      }

      const groupResult = await createGroup({ authenticatedFetch, payload })
      if ('error' in groupResult) {
        showSnackbar(groupResult.error, 'error')
        return
      }
      const savedGroup = groupResult.group

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

      showSnackbar('Група паспяхова дададзена', 'success')

      resetForm()
      onDone()
    } catch (error) {
      console.error('Error saving group:', error)
      showSnackbar(
        mode === 'create' ? 'Памылка пры даданні групы' : 'Памылка пры рэдагаванні групы',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" component="h2">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={handleCancel}>
              <BelarusianText belarusian="Назад" russian="Назад" />
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid() || loading || Boolean(loadError)}
            >
              <BelarusianText belarusian="Захаваць" russian="Сохранить" />
            </Button>
          </Box>
        </Box>

        {loadError && (
          <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>
            {loadError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Назва"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            fullWidth
            required
            disabled={loading}
          />

          <FormControl fullWidth required disabled={loading}>
            <InputLabel id="teacher-select-label">Выкладчык</InputLabel>
            <Select
              labelId="teacher-select-label"
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

          <FormControl fullWidth required disabled={loading}>
            <InputLabel id="subject-select-label">Прадмет</InputLabel>
            <Select
              labelId="subject-select-label"
              value={selectedSubject}
              label="Прадмет"
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              {GROUP_SUBJECTS.map((subject) => (
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
              disabled={loading}
            />
          )}

          <FormControl fullWidth required disabled={loading}>
            <InputLabel id="level-select-label">Узровень</InputLabel>
            <Select
              labelId="level-select-label"
              value={selectedLevel}
              label="Узровень"
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              {GROUP_LEVELS.map((level) => (
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
                <IconButton
                  aria-label="Дадаць занятак"
                  size="small"
                  color="primary"
                  onClick={handleAddSchedule}
                  disabled={loading}
                >
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
                    key={`${schedule.date}-${schedule.startTime}-${schedule.endTime}-${index}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {formatDate(schedule.date)} {formatTime(schedule.startTime)} -{' '}
                      {formatTime(schedule.endTime)}
                    </Typography>
                    <IconButton
                      aria-label="Рэдагаваць занятак"
                      size="small"
                      onClick={() => handleEditSchedule(index)}
                      color="primary"
                      disabled={loading}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Выдаліць занятак"
                      size="small"
                      onClick={() => handleDeleteSchedule(index)}
                      color="error"
                      disabled={loading}
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
                <IconButton
                  aria-label="Дадаць студента"
                  size="small"
                  color="primary"
                  onClick={handleAddStudent}
                  disabled={loading}
                >
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
                    key={`${student.fullName}-${index}`}
                    sx={{
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: schedules.length > 0 ? 1 : 0,
                      }}
                    >
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {student.fullName}
                      </Typography>
                      <IconButton
                        aria-label="Рэдагаваць студента"
                        size="small"
                        onClick={() => handleEditStudent(index)}
                        color="primary"
                        disabled={loading}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Выдаліць студента"
                        size="small"
                        onClick={() => handleDeleteStudent(index)}
                        color="error"
                        disabled={loading}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {schedules.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {schedules.map((schedule, scheduleIndex) => {
                          const status = getAttendanceStatus({
                            student,
                            schedule,
                            attendanceMap,
                          })
                          return (
                            <Chip
                              key={`${schedule.date}-${schedule.startTime}-${schedule.endTime}-${scheduleIndex}`}
                              label={formatDate(schedule.date)}
                              size="small"
                              onClick={() => handleOpenAttendanceDialog(student, schedule)}
                              sx={{
                                cursor: 'pointer',
                                backgroundColor:
                                  status === 'absent'
                                    ? 'orange'
                                    : status === 'present'
                                      ? 'green'
                                      : 'grey.300',
                                color: status ? 'white' : 'inherit',
                                '&:hover': {
                                  backgroundColor:
                                    status === 'absent'
                                      ? 'orange'
                                      : status === 'present'
                                        ? 'green'
                                        : 'grey.400',
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

        {/* Диалог добавления/редактирования занятия */}
        <Dialog
          open={openScheduleDialog}
          onClose={() => setOpenScheduleDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitleWithClose onClose={() => setOpenScheduleDialog(false)}>
            <BelarusianText
              belarusian={
                editingScheduleIndex !== null ? 'Рэдагаваць занятак' : 'Дадаць занятак'
              }
              russian={
                editingScheduleIndex !== null
                  ? 'Редактировать занятие'
                  : 'Добавить занятие'
              }
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
            <Button onClick={() => setOpenScheduleDialog(false)}>
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
          onClose={() => setOpenStudentDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitleWithClose onClose={() => setOpenStudentDialog(false)}>
            <BelarusianText
              belarusian={
                editingStudentIndex !== null ? 'Рэдагаваць студента' : 'Дадаць студента'
              }
              russian={
                editingStudentIndex !== null
                  ? 'Редактировать студента'
                  : 'Добавить студента'
              }
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
            <Button onClick={() => setOpenStudentDialog(false)}>
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
          onClose={() => setOpenAttendanceDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitleWithClose onClose={() => setOpenAttendanceDialog(false)}>
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
                    value={`${formatTime(attendanceSchedule.startTime)} - ${formatTime(
                      attendanceSchedule.endTime
                    )}`}
                    disabled
                    fullWidth
                  />
                </>
              )}
              <FormControl fullWidth>
                <InputLabel id="attendance-status-label">Статус</InputLabel>
                <Select
                  labelId="attendance-status-label"
                  value={attendanceStatus}
                  label="Статус"
                  onChange={(e) =>
                    setAttendanceStatus(e.target.value as AttendanceEditStatus)
                  }
                >
                  <MenuItem value="unset">
                    <BelarusianText
                      belarusian="Не ўсталявана"
                      russian="Не установлено"
                    />
                  </MenuItem>
                  <MenuItem value="present">
                    <BelarusianText
                      belarusian="Прысутнічаў"
                      russian="Присутствовал"
                    />
                  </MenuItem>
                  <MenuItem value="absent">
                    <BelarusianText belarusian="Адсутнічаў" russian="Отсутствовал" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAttendanceDialog(false)}>
              <BelarusianText belarusian="Адмена" russian="Отмена" />
            </Button>
            <Button onClick={handleSaveAttendance} variant="contained">
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
            <BelarusianText belarusian="Выдаліць занятак?" russian="Удалить занятие?" />
          }
          message="Вы сапраўды хочаце выдаліць гэта занятак?"
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
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  )
}

