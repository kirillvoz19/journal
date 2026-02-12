import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/ru'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { BelarusianText } from '../../../../../components/BelarusianText'
import { DialogTitleWithClose } from '../../../../../shared/ui/dialog-title-with-close'
import type { AttendanceEditStatus, GroupSchedule, GroupStudent } from '../../../model/types'

dayjs.extend(customParseFormat)
dayjs.locale('ru')

export type LessonDialogMode = 'create' | 'edit'

export type LessonDialogInitialValues = {
  schedule?: GroupSchedule
  defaultDateIso?: string
  defaultStartTime?: string
  defaultEndTime?: string
  defaultIsTrialLesson?: boolean
  defaultComment?: string
  defaultStatusesByStudentKeyPart?: Record<string, AttendanceEditStatus>
}

export type LessonDialogSavePayload = {
  schedule: GroupSchedule
  statusesByStudentKeyPart: Record<string, AttendanceEditStatus>
}

export type LessonDialogProps = {
  open: boolean
  disabled?: boolean
  mode: LessonDialogMode
  students: GroupStudent[]
  initialValues: LessonDialogInitialValues
  onClose: () => void
  onSave: (payload: LessonDialogSavePayload) => void
}

const toDayjsTime = (value: string | undefined): Dayjs | null => {
  if (!value) return null
  const parsed = dayjs(value, 'HH:mm')
  return parsed.isValid() ? parsed : null
}

const toDayjsDate = (iso: string | undefined): Dayjs | null => {
  if (!iso) return null
  const parsed = dayjs(iso)
  return parsed.isValid() ? parsed : null
}

const buildDefaultStatuses = (students: GroupStudent[]): Record<string, AttendanceEditStatus> => {
  const record: Record<string, AttendanceEditStatus> = {}
  for (const s of students) {
    record[s.fullName] = 'unset'
  }
  return record
}

const getAttendanceStatusBackgroundColor = (status: AttendanceEditStatus): string => {
  switch (status) {
    case 'present':
      return 'rgba(76, 175, 80, 0.15)'
    case 'absent':
      return 'rgba(244, 67, 54, 0.15)'
    case 'unset':
    default:
      return 'rgba(255, 152, 0, 0.2)'
  }
}

export const LessonDialog = (props: LessonDialogProps) => {
  const { open, disabled = false, mode, students, initialValues, onClose, onSave } = props

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false)
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false)

  const [lessonDate, setLessonDate] = useState<Dayjs | null>(null)
  const [lessonStartTime, setLessonStartTime] = useState<Dayjs | null>(null)
  const [lessonEndTime, setLessonEndTime] = useState<Dayjs | null>(null)
  const [isTrialLesson, setIsTrialLesson] = useState(false)
  const [comment, setComment] = useState('')
  const [statusesByStudentKeyPart, setStatusesByStudentKeyPart] = useState<
    Record<string, AttendanceEditStatus>
  >({})

  const canSave = Boolean(lessonDate && lessonStartTime && lessonEndTime)

  const dialogTitle = useMemo(() => {
    if (mode === 'edit') {
      return <BelarusianText belarusian="Рэдагаваць урок" russian="Редактировать урок" />
    }
    return <BelarusianText belarusian="Дадаць урок" russian="Добавить урок" />
  }, [mode])

  useEffect(() => {
    if (!open) return

    const schedule = initialValues.schedule
    setLessonDate(toDayjsDate(schedule?.date ?? initialValues.defaultDateIso))
    setLessonStartTime(toDayjsTime(schedule?.startTime ?? initialValues.defaultStartTime))
    setLessonEndTime(toDayjsTime(schedule?.endTime ?? initialValues.defaultEndTime))
    setIsTrialLesson(Boolean(schedule?.isTrialLesson ?? initialValues.defaultIsTrialLesson))
    setComment(initialValues.defaultComment ?? '')

    const defaults = buildDefaultStatuses(students)
    const incoming = initialValues.defaultStatusesByStudentKeyPart ?? {}
    setStatusesByStudentKeyPart({ ...defaults, ...incoming })

    setDatePickerOpen(false)
    setStartTimePickerOpen(false)
    setEndTimePickerOpen(false)
  }, [open, initialValues, students])

  const handleSave = () => {
    if (!lessonDate || !lessonStartTime || !lessonEndTime) return

    const schedule: GroupSchedule = {
      // Keep any existing id so the UI can match by id within the same session.
      ...(initialValues.schedule?.id ? { id: initialValues.schedule.id } : {}),
      date: lessonDate.format('YYYY-MM-DD'),
      startTime: lessonStartTime.format('HH:mm'),
      endTime: lessonEndTime.format('HH:mm'),
      isTrialLesson,
      comment: comment.trim() || undefined,
    }

    onSave({
      schedule,
      statusesByStudentKeyPart,
    })
  }

  const handleChangeStatus = (studentKeyPart: string, next: AttendanceEditStatus) => {
    setStatusesByStudentKeyPart((prev) => ({ ...prev, [studentKeyPart]: next }))
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ru">
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitleWithClose onClose={onClose}>{dialogTitle}</DialogTitleWithClose>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="subtitle2">
              <BelarusianText belarusian="Урок" russian="Урок" />
            </Typography>

            <DatePicker
              label="Дата"
              value={lessonDate}
              onChange={(newValue) => setLessonDate(newValue)}
              open={datePickerOpen}
              onOpen={() => setDatePickerOpen(true)}
              onClose={() => setDatePickerOpen(false)}
              disabled={disabled}
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
              value={lessonStartTime}
              onChange={(newValue) => setLessonStartTime(newValue)}
              open={startTimePickerOpen}
              onOpen={() => setStartTimePickerOpen(true)}
              onClose={() => setStartTimePickerOpen(false)}
              ampm={false}
              disabled={disabled}
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
              value={lessonEndTime}
              onChange={(newValue) => setLessonEndTime(newValue)}
              open={endTimePickerOpen}
              onOpen={() => setEndTimePickerOpen(true)}
              onClose={() => setEndTimePickerOpen(false)}
              ampm={false}
              disabled={disabled}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  onClick: () => setEndTimePickerOpen(true),
                },
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={isTrialLesson}
                  onChange={(event) => setIsTrialLesson(event.target.checked)}
                  inputProps={{ 'aria-label': 'Пробны урок' }}
                  disabled={disabled}
                />
              }
              label="Пробны урок"
            />

            <Typography variant="subtitle2">
              <BelarusianText belarusian="Студэнты" russian="Студенты" />
            </Typography>

            {students.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                <BelarusianText belarusian="Няма студэнтаў" russian="Нет студентов" />
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {students.map((student) => {
                  const keyPart = student.fullName
                  const value = statusesByStudentKeyPart[keyPart] ?? 'unset'
                  return (
                    <Box
                      key={keyPart}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                    >
                      <Typography variant="body2" sx={{ flex: '1 1 240px', minWidth: 180 }}>
                        {student.fullName}
                      </Typography>
                      <FormControl size="small" sx={{ flex: '1 1 220px', minWidth: 200 }}>
                        <InputLabel id={`attendance-status-${keyPart}`}>Статус</InputLabel>
                        <Select
                          labelId={`attendance-status-${keyPart}`}
                          value={value}
                          label="Статус"
                          onChange={(e) =>
                            handleChangeStatus(keyPart, e.target.value as AttendanceEditStatus)
                          }
                          disabled={disabled}
                          sx={{
                            backgroundColor: getAttendanceStatusBackgroundColor(value),
                          }}
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
                  )
                })}
              </Box>
            )}

            <Typography variant="subtitle2">
              <BelarusianText belarusian="Каментар" russian="Комментарий" />
            </Typography>
            <TextField
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="..."
              disabled={disabled}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={disabled}>
            <BelarusianText belarusian="Адмена" russian="Отмена" />
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={!canSave || disabled}>
            <BelarusianText belarusian="Захаваць" russian="Сохранить" />
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}

