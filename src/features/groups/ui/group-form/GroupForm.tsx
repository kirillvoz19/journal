import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { BelarusianText } from '../../../../components/BelarusianText'
import { ConfirmDialog } from '../../../../components/ConfirmDialog'
import { DialogTitleWithClose } from '../../../../shared/ui/dialog-title-with-close'
import type { Teacher } from '../../../../entities/teacher/model/types'
import {
  deleteAttendanceRecords,
  loadAttendanceMapForGroup,
  saveAttendanceRecords,
  getScheduleAttendanceKeyPart,
  getStudentAttendanceKeyPart,
  makeAttendanceKey,
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
import { StudentsInlineList } from './students-inline-list'
import { ScheduleCalendar } from './schedule-calendar'
import {
  LessonDialog,
  type LessonDialogInitialValues,
  type LessonDialogMode,
  type LessonDialogSavePayload,
} from './lesson-dialog'
import {
  migrateStudentKeys,
  removeAttendanceForSchedule,
  removeAttendanceForStudent,
} from '../../lib/group-form/attendanceKeyOps'
import { getMonthLabel } from '../../lib/journal-calendar/monthLabels'

export type GroupFormMode = 'create' | 'edit'

export interface GroupFormDoneToastPayload {
  message: string
  severity: 'success' | 'error'
}

export interface GroupFormDonePayload {
  toast: GroupFormDoneToastPayload
}

export interface GroupFormProps {
  title: ReactNode
  mode: GroupFormMode
  groupId?: number
  authenticatedFetch: AuthenticatedFetch
  /** Роль «учитель»: в селекторе выкладчыка показывать только текущего пользователя */
  isTeacher?: boolean
  /** Логин текущего пользователя (для учителя — совпадает с teacher.username) */
  currentUsername?: string
  onDone: (payload?: GroupFormDonePayload) => void
  onCancel: () => void
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
  const { title, mode, groupId, authenticatedFetch, isTeacher, currentUsername, onDone, onCancel } =
    props

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

  // Модалки внутри формы
  const [openLessonDialog, setOpenLessonDialog] = useState(false)
  const [lessonDialogMode, setLessonDialogMode] = useState<LessonDialogMode>('create')
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null)
  const [lessonDialogInitialValues, setLessonDialogInitialValues] =
    useState<LessonDialogInitialValues>({})

  const [openStudentDialog, setOpenStudentDialog] = useState(false)
  const [editingStudentIndex, setEditingStudentIndex] = useState<number | null>(null)
  const [studentFullName, setStudentFullName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')

  const [openDeleteScheduleConfirm, setOpenDeleteScheduleConfirm] = useState(false)
  const [scheduleToDeleteIndex, setScheduleToDeleteIndex] = useState<number | null>(null)

  const [openDeleteMonthConfirm, setOpenDeleteMonthConfirm] = useState(false)
  const [monthToDelete, setMonthToDelete] = useState<{ year: number; monthIndex0: number } | null>(
    null
  )

  const [openDeleteStudentConfirm, setOpenDeleteStudentConfirm] = useState(false)
  const [studentToDeleteIndex, setStudentToDeleteIndex] = useState<number | null>(null)

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
    setSelectedTeacherId(group.teacherId ?? '')
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
        if (isTeacher && currentUsername) {
          const currentTeacher = nextTeachers.find((t) => t.username === currentUsername)
          if (currentTeacher) {
            setSelectedTeacherId(currentTeacher.id)
          }
        }
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

      if (isTeacher && currentUsername) {
        const currentTeacher = nextTeachers.find((t) => t.username === currentUsername)
        if (currentTeacher) {
          setSelectedTeacherId(currentTeacher.id)
        }
      }

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

  /** Для учителя в селекторе показываем только текущего пользователя */
  const teachersForSelect = useMemo((): Teacher[] => {
    if (isTeacher && currentUsername) {
      const current = teachers.find((t) => t.username === currentUsername)
      return current ? [current] : []
    }
    return teachers
  }, [isTeacher, currentUsername, teachers])

  const isFormValid = (): boolean => {
    if (!groupName.trim()) return false
    if (!selectedTeacherId) return false
    if (!selectedSubject) return false
    if (!selectedLevel) return false
    if (selectedSubject === 'Другой язык' && !customSubject.trim()) return false
    return true
  }

  const defaultLessonTimes = useMemo((): { startTime?: string; endTime?: string } => {
    if (schedules.length === 0) return {}
    const sorted = [...schedules].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
      return a.endTime.localeCompare(b.endTime)
    })
    const last = sorted[sorted.length - 1]
    return last ? { startTime: last.startTime, endTime: last.endTime } : {}
  }, [schedules])

  const buildStatusesForSchedule = (schedule: GroupSchedule): Record<string, AttendanceEditStatus> => {
    const schedulePart = getScheduleAttendanceKeyPart(schedule)
    const record: Record<string, AttendanceEditStatus> = {}
    for (const student of students) {
      const studentPart = getStudentAttendanceKeyPart(student)
      const key = makeAttendanceKey(studentPart, schedulePart)
      record[studentPart] = attendanceMap.get(key) ?? 'unset'
    }
    return record
  }

  const findScheduleIndex = (schedule: GroupSchedule): number => {
    if (typeof schedule.id === 'number') {
      const idx = schedules.findIndex((s) => s.id === schedule.id)
      if (idx >= 0) return idx
    }
    const signature = getScheduleAttendanceKeyPart(schedule)
    return schedules.findIndex((s) => getScheduleAttendanceKeyPart(s) === signature)
  }

  const handleOpenAddLessonDialog = (params?: { isoDate?: string }) => {
    setLessonDialogMode('create')
    setEditingScheduleIndex(null)
    setLessonDialogInitialValues({
      defaultDateIso: params?.isoDate,
      defaultStartTime: defaultLessonTimes.startTime,
      defaultEndTime: defaultLessonTimes.endTime,
      defaultIsTrialLesson: false,
      defaultComment: '',
      defaultStatusesByStudentKeyPart: {},
    })
    setOpenLessonDialog(true)
  }

  const handleOpenEditLessonDialog = (params: { schedule: GroupSchedule }) => {
    const index = findScheduleIndex(params.schedule)
    if (index < 0) return
    const schedule = schedules[index]

    setLessonDialogMode('edit')
    setEditingScheduleIndex(index)
    setLessonDialogInitialValues({
      schedule,
      defaultComment: schedule.comment ?? '',
      defaultStatusesByStudentKeyPart: buildStatusesForSchedule(schedule),
    })
    setOpenLessonDialog(true)
  }

  const handleDeleteSchedule = (index: number) => {
    setScheduleToDeleteIndex(index)
    setOpenDeleteScheduleConfirm(true)
  }

  const handleConfirmDeleteSchedule = () => {
    if (scheduleToDeleteIndex === null) return

    const schedule = schedules[scheduleToDeleteIndex]
    if (!schedule) return

    const attendanceRemoved = removeAttendanceForSchedule({
      students,
      schedule,
      attendanceMap,
      unsetAttendanceKeys,
    })

    setAttendanceMap(attendanceRemoved.attendanceMap)
    setUnsetAttendanceKeys(attendanceRemoved.unsetAttendanceKeys)
    setSchedules((prev) => prev.filter((_, i) => i !== scheduleToDeleteIndex))

    setOpenDeleteScheduleConfirm(false)
    setScheduleToDeleteIndex(null)
  }

  const handleDeleteScheduleFromEntity = (params: { schedule: GroupSchedule }) => {
    const index = findScheduleIndex(params.schedule)
    if (index < 0) return
    handleDeleteSchedule(index)
  }

  const handleOpenDeleteMonth = (params: { year: number; monthIndex0: number }) => {
    setMonthToDelete(params)
    setOpenDeleteMonthConfirm(true)
  }

  const handleConfirmDeleteMonth = () => {
    if (!monthToDelete) return
    const { year, monthIndex0 } = monthToDelete

    const schedulesToRemove = schedules.filter((s) => {
      const d = dayjs(s.date)
      return d.isValid() && d.year() === year && d.month() === monthIndex0
    })

    if (schedulesToRemove.length === 0) {
      setOpenDeleteMonthConfirm(false)
      setMonthToDelete(null)
      return
    }

    let nextAttendanceMap = new Map(attendanceMap)
    let nextUnsetKeys = new Set(unsetAttendanceKeys)

    for (const schedule of schedulesToRemove) {
      const removed = removeAttendanceForSchedule({
        students,
        schedule,
        attendanceMap: nextAttendanceMap,
        unsetAttendanceKeys: nextUnsetKeys,
      })
      nextAttendanceMap = removed.attendanceMap
      nextUnsetKeys = removed.unsetAttendanceKeys
    }

    setAttendanceMap(nextAttendanceMap)
    setUnsetAttendanceKeys(nextUnsetKeys)
    setSchedules((prev) =>
      prev.filter((s) => {
        const d = dayjs(s.date)
        return !(d.isValid() && d.year() === year && d.month() === monthIndex0)
      })
    )

    setOpenDeleteMonthConfirm(false)
    setMonthToDelete(null)
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
      const prevStudent = updated[editingStudentIndex]
      updated[editingStudentIndex] = newStudent
      setStudents(updated)

      if (prevStudent) {
        const migrated = migrateStudentKeys({
          schedules,
          fromStudent: prevStudent,
          toStudent: newStudent,
          attendanceMap,
          unsetAttendanceKeys,
        })
        setAttendanceMap(migrated.attendanceMap)
        setUnsetAttendanceKeys(migrated.unsetAttendanceKeys)
      }
    } else {
      setStudents((prev) => [...prev, newStudent])
    }

    setOpenStudentDialog(false)
  }

  const handleDeleteStudentClick = (index: number) => {
    setStudentToDeleteIndex(index)
    setOpenDeleteStudentConfirm(true)
  }

  const handleConfirmDeleteStudent = () => {
    if (studentToDeleteIndex === null) return
    const student = students[studentToDeleteIndex]
    if (!student) {
      setOpenDeleteStudentConfirm(false)
      setStudentToDeleteIndex(null)
      return
    }

    const removed = removeAttendanceForStudent({
      schedules,
      student,
      attendanceMap,
      unsetAttendanceKeys,
    })
    setAttendanceMap(removed.attendanceMap)
    setUnsetAttendanceKeys(removed.unsetAttendanceKeys)
    setStudents((prev) => prev.filter((_, i) => i !== studentToDeleteIndex))
    setOpenDeleteStudentConfirm(false)
    setStudentToDeleteIndex(null)
  }

  const handleSaveLesson = (payload: LessonDialogSavePayload) => {
    const { schedule: nextSchedule, statusesByStudentKeyPart } = payload

    // Edit existing schedule
    if (editingScheduleIndex !== null) {
      const prevSchedule = schedules[editingScheduleIndex]
      if (!prevSchedule) return

      const prevPart = getScheduleAttendanceKeyPart(prevSchedule)
      const nextPart = getScheduleAttendanceKeyPart(nextSchedule)
      const scheduleChanged = prevPart !== nextPart

      setSchedules((prev) => {
        const updated = [...prev]
        updated[editingScheduleIndex] = nextSchedule
        return updated
      })

      let nextMap = new Map(attendanceMap)
      let nextUnset = new Set(unsetAttendanceKeys)

      if (scheduleChanged) {
        const removed = removeAttendanceForSchedule({
          students,
          schedule: prevSchedule,
          attendanceMap: nextMap,
          unsetAttendanceKeys: nextUnset,
        })
        nextMap = removed.attendanceMap
        nextUnset = removed.unsetAttendanceKeys

        // Re-apply new statuses under new signature (no need to track deletes: schedule will be recreated on save)
        for (const student of students) {
          const studentPart = getStudentAttendanceKeyPart(student)
          const desired = statusesByStudentKeyPart[studentPart] ?? 'unset'
          const key = makeAttendanceKey(studentPart, nextPart)
          nextUnset.delete(key)
          if (desired === 'unset') {
            nextMap.delete(key)
            continue
          }
          nextMap.set(key, desired)
        }
      } else {
        for (const student of students) {
          const studentPart = getStudentAttendanceKeyPart(student)
          const key = makeAttendanceKey(studentPart, nextPart)
          const desired = statusesByStudentKeyPart[studentPart] ?? 'unset'
          const existing = nextMap.get(key) ?? null

          if (desired === 'unset') {
            if (existing) {
              nextMap.delete(key)
              nextUnset.add(key)
            }
            continue
          }

          nextMap.set(key, desired)
          nextUnset.delete(key)
        }
      }

      setAttendanceMap(nextMap)
      setUnsetAttendanceKeys(nextUnset)
      setOpenLessonDialog(false)
      return
    }

    // Create new schedule
    setSchedules((prev) => [...prev, nextSchedule])

    const schedulePart = getScheduleAttendanceKeyPart(nextSchedule)

    const nextMap = new Map(attendanceMap)
    const nextUnset = new Set(unsetAttendanceKeys)

    for (const student of students) {
      const studentPart = getStudentAttendanceKeyPart(student)
      const desired = statusesByStudentKeyPart[studentPart] ?? 'unset'
      const key = makeAttendanceKey(studentPart, schedulePart)
      nextUnset.delete(key)
      if (desired === 'unset') continue
      nextMap.set(key, desired)
    }

    setAttendanceMap(nextMap)
    setUnsetAttendanceKeys(nextUnset)
    setOpenLessonDialog(false)
  }

  const handleSubmit = async () => {
    if (!isFormValid()) return
    try {
      setLoading(true)

      const payload = {
        name: groupName.trim(),
        teacherId:
          selectedTeacherId === '' || selectedTeacherId == null
            ? null
            : selectedTeacherId,
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

        resetForm()
        onDone({
          toast: {
            message: 'Група паспяхова адрэдагавана',
            severity: 'success',
          },
        })
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

      resetForm()
      onDone({
        toast: {
          message: 'Група паспяхова дададзена',
          severity: 'success',
        },
      })
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        gap: 0,
        position: 'relative',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <CircularProgress size={48} aria-label="Загрузка" />
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          pb: 2,
        }}
      >
        {/* Блок: редактировать группу + инпуты до подзаголовка Студенты */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            p: 2,
          }}
        >
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            {title}
          </Typography>

          {loadError && (
            <Alert severity="error" sx={{ whiteSpace: 'pre-line', mb: 2 }}>
              {loadError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Tooltip title="Название" arrow placement="top-start">
              <TextField
                label="Назва"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                fullWidth
                required
                disabled={loading}
              />
            </Tooltip>

            <Tooltip title="Преподаватель" arrow placement="top-start">
              <FormControl fullWidth disabled={loading}>
                <InputLabel id="teacher-select-label">Выкладчык</InputLabel>
                <Select
                  labelId="teacher-select-label"
                  value={selectedTeacherId === '' ? '' : String(selectedTeacherId)}
                  label="Выкладчык"
                  onChange={(e) =>
                    setSelectedTeacherId(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                >
                  {!isTeacher && (
                    <MenuItem value="">
                      <em>Не паказана</em>
                    </MenuItem>
                  )}
                  {teachersForSelect.map((teacher) => (
                    <MenuItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.username} {teacher.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Tooltip>

            <Tooltip title="Предмет" arrow placement="top-start">
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
            </Tooltip>

            {selectedSubject === 'Другой язык' && (
              <Tooltip title="Название предмета" arrow placement="top-start">
                <TextField
                  label="Назва прадмета"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
              </Tooltip>
            )}

            <Tooltip title="Уровень" arrow placement="top-start">
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
            </Tooltip>
          </Box>
        </Paper>

        {/* Блок: Студенты */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            p: 2,
          }}
        >
          <StudentsInlineList
            students={students}
            disabled={loading}
            onAddStudent={handleAddStudent}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudentClick}
          />
        </Paper>

        {/* Графік: заголовок отдельным блоком, годы в контейнере — внутри ScheduleCalendar */}
        <ScheduleCalendar
            schedules={schedules}
            disabled={loading}
            onAddLesson={handleOpenAddLessonDialog}
            onEditLesson={handleOpenEditLessonDialog}
            onDeleteLesson={handleDeleteScheduleFromEntity}
            onDeleteMonth={handleOpenDeleteMonth}
          />
      </Box>

      <Box
        component="footer"
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            maxWidth: 1300,
            width: '100%',
            boxSizing: 'border-box',
            margin: 'auto',
            px: { xs: 5, sm: 6 },
            py: 2,
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
        <Button
          variant="outlined"
          onClick={handleCancel}
          disabled={loading}
          aria-label="Назад"
          sx={{
            color: '#388e3c',
            borderColor: '#388e3c',
            '&:hover': {
              borderColor: '#2e7d32',
              color: '#2e7d32',
              backgroundColor: '#28a745',
            },
            '&:disabled': {
              borderColor: 'action.disabled',
              color: 'action.disabled',
            },
          }}
        >
          <BelarusianText belarusian="Назад" russian="Назад" />
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isFormValid() || loading || Boolean(loadError)}
          aria-label="Захаваць"
          sx={{
            backgroundColor: '#388e3c',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#2e7d32',
              color: '#fff',
            },
            '&:disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled',
            },
          }}
        >
          <BelarusianText belarusian="Захаваць" russian="Сохранить" />
        </Button>
        </Box>
      </Box>

        <LessonDialog
          open={openLessonDialog}
          disabled={loading}
          mode={lessonDialogMode}
          students={students}
          initialValues={lessonDialogInitialValues}
          onClose={() => setOpenLessonDialog(false)}
          onSave={handleSaveLesson}
        />

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
                editingStudentIndex !== null ? 'Рэдагаваць студэнта' : 'Дадаць студэнта'
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
              <Tooltip title="ФИО" arrow placement="top-start">
                <TextField
                  label="ПІБ"
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  fullWidth
                  required
                />
              </Tooltip>
              <Tooltip title="Эл. почта" arrow placement="top-start">
                <TextField
                  label="Email"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  fullWidth
                />
              </Tooltip>
              <Tooltip title="Телефон" arrow placement="top-start">
                <TextField
                  label="Тэлефон"
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  fullWidth
                />
              </Tooltip>
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

        {/* Подтверждение удаления месяца */}
        <ConfirmDialog
          open={openDeleteMonthConfirm}
          onClose={() => {
            setOpenDeleteMonthConfirm(false)
            setMonthToDelete(null)
          }}
          onConfirm={handleConfirmDeleteMonth}
          title={
            <BelarusianText belarusian="Выдаліць месяц?" russian="Удалить месяц?" />
          }
          message={
            monthToDelete ? (
              (() => {
                const label = getMonthLabel(monthToDelete)
                return `Вы уверены что хотите удалить ${label.russian}?`
              })()
            ) : (
              ''
            )
          }
          confirmText={<BelarusianText belarusian="Выдаліць" russian="Удалить" />}
          cancelText={<BelarusianText belarusian="Адмена" russian="Отмена" />}
          confirmColor="error"
        />

        {/* Подтверждение удаления студента */}
        <ConfirmDialog
          open={openDeleteStudentConfirm}
          onClose={() => {
            setOpenDeleteStudentConfirm(false)
            setStudentToDeleteIndex(null)
          }}
          onConfirm={handleConfirmDeleteStudent}
          title={
            <BelarusianText belarusian="Выдаліць студэнта?" russian="Удалить студента?" />
          }
          message={
            studentToDeleteIndex !== null && students[studentToDeleteIndex]
              ? (() => {
                  const name = students[studentToDeleteIndex]?.fullName ?? ''
                  return (
                    <>
                      <BelarusianText
                        belarusian="Вы сапраўды хочаце выдаліць студэнта?"
                        russian="Вы действительно хотите удалить студента?"
                      />
                      {'\n\n'}
                      {name}
                    </>
                  )
                })()
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
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
    </Box>
  )
}

