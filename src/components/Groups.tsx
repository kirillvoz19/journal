import React, { useState, useEffect } from 'react'
import {
  Box,
  Button,
  TextField,
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
  Chip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { BelarusianText } from './BelarusianText'
import { ConfirmDialog } from './ConfirmDialog'

interface Teacher {
  id: number
  username: string
  fullName: string
}

interface GroupSchedule {
  id?: number
  date: string
  startTime: string
  endTime: string
}

interface GroupStudent {
  id?: number
  fullName: string
  email?: string
  phone?: string
}

interface Group {
  id?: number
  name: string
  teacherId: number
  subject: string
  customSubject?: string
  level: string
  schedules?: GroupSchedule[]
  students?: GroupStudent[]
}

interface GroupsProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const SUBJECTS = ['Немецкий', 'Английский', 'Польский', 'Другой язык']
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const Groups: React.FC<GroupsProps> = ({ authenticatedFetch }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // Форма группы
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
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleStartTime, setScheduleStartTime] = useState('')
  const [scheduleEndTime, setScheduleEndTime] = useState('')

  const [openStudentDialog, setOpenStudentDialog] = useState(false)
  const [editingStudentIndex, setEditingStudentIndex] = useState<number | null>(null)
  const [studentFullName, setStudentFullName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [studentPhone, setStudentPhone] = useState('')

  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false)
  const [attendanceStudent, setAttendanceStudent] = useState<GroupStudent | null>(null)
  const [attendanceSchedule, setAttendanceSchedule] = useState<GroupSchedule | null>(null)
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent'>('present')
  const [attendanceMap, setAttendanceMap] = useState<Map<string, 'present' | 'absent'>>(new Map())

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
  }, [])

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
  }

  const handleOpenAddDialog = () => {
    resetForm()
    setOpenAddDialog(true)
  }

  const handleAddSchedule = () => {
    setEditingScheduleIndex(null)
    setScheduleDate('')
    setScheduleStartTime('')
    setScheduleEndTime('')
    setOpenScheduleDialog(true)
  }

  const handleEditSchedule = (index: number) => {
    const schedule = schedules[index]
    setEditingScheduleIndex(index)
    setScheduleDate(schedule.date)
    setScheduleStartTime(schedule.startTime)
    setScheduleEndTime(schedule.endTime)
    setOpenScheduleDialog(true)
  }

  const handleSaveSchedule = () => {
    if (!scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      return
    }

    const newSchedule: GroupSchedule = {
      date: scheduleDate,
      startTime: scheduleStartTime,
      endTime: scheduleEndTime,
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
    const key = `${student.id || student.fullName}-${schedule.date}`
    const existingStatus = attendanceMap.get(key) || 'present'
    setAttendanceStatus(existingStatus)
    setOpenAttendanceDialog(true)
  }

  const handleSaveAttendance = () => {
    if (!attendanceStudent || !attendanceSchedule) {
      return
    }
    const key = `${attendanceStudent.id || attendanceStudent.fullName}-${attendanceSchedule.date}`
    const newMap = new Map(attendanceMap)
    newMap.set(key, attendanceStatus)
    setAttendanceMap(newMap)
    setOpenAttendanceDialog(false)
  }

  const getAttendanceStatus = (student: GroupStudent, schedule: GroupSchedule): 'present' | 'absent' | null => {
    const key = `${student.id || student.fullName}-${schedule.date}`
    return attendanceMap.get(key) || null
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
      if (savedGroup.students && savedGroup.schedules && attendanceMap.size > 0) {
        for (const [key, status] of attendanceMap.entries()) {
          const [studentKey, date] = key.split('-')
          const student = savedGroup.students!.find((s) => (s.id?.toString() || s.fullName) === studentKey)
          const schedule = savedGroup.schedules!.find((s) => s.date === date)
          
          if (student && schedule && student.id && schedule.id) {
            await authenticatedFetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: student.id,
                scheduleId: schedule.id,
                status: status,
              }),
            })
          }
        }
      }

      setOpenAddDialog(false)
      resetForm()
      setAttendanceMap(new Map())
      showSnackbar('Група паспяхова дададзена', 'success')
    } catch (error) {
      console.error('Error saving group:', error)
      showSnackbar('Памылка пры даданні групы', 'error')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    return !!(
      groupName.trim() &&
      selectedTeacherId &&
      selectedSubject &&
      selectedLevel
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Tooltip title="Дадаць новую групу">
          <IconButton
            color="primary"
            onClick={handleOpenAddDialog}
            sx={{ border: '1px solid', borderColor: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Диалог добавления группы */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <BelarusianText belarusian="Дадаць групу" russian="Добавить группу" />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Название"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Преподаватель</InputLabel>
              <Select
                value={selectedTeacherId}
                label="Преподаватель"
                onChange={(e) => setSelectedTeacherId(e.target.value as number)}
              >
                {teachers.map((teacher) => (
                  <MenuItem key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Предмет</InputLabel>
              <Select
                value={selectedSubject}
                label="Предмет"
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
                label="Название предмета"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                fullWidth
                required
              />
            )}

            <FormControl fullWidth required>
              <InputLabel>Уровень</InputLabel>
              <Select
                value={selectedLevel}
                label="Уровень"
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
          <Button onClick={() => setOpenAddDialog(false)}>
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
        onClose={() => setOpenScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <BelarusianText
            belarusian={editingScheduleIndex !== null ? 'Рэдагаваць занятак' : 'Дадаць занятак'}
            russian={editingScheduleIndex !== null ? 'Редактировать занятие' : 'Добавить занятие'}
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Дата"
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Время начала"
              type="time"
              value={scheduleStartTime}
              onChange={(e) => setScheduleStartTime(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Время конца"
              type="time"
              value={scheduleEndTime}
              onChange={(e) => setScheduleEndTime(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
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
        <DialogTitle>
          <BelarusianText
            belarusian={editingStudentIndex !== null ? 'Рэдагаваць студента' : 'Дадаць студента'}
            russian={editingStudentIndex !== null ? 'Редактировать студента' : 'Добавить студента'}
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="ФИО"
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
              label="Телефон"
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
        <DialogTitle>
          <BelarusianText
            belarusian="Змена звестак пра наведванне"
            russian="Изменение сведений о посещаемости"
          />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {attendanceStudent && (
              <TextField
                label="ФИО студента"
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
                  label="Время занятий"
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
                onChange={(e) => setAttendanceStatus(e.target.value as 'present' | 'absent')}
              >
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
