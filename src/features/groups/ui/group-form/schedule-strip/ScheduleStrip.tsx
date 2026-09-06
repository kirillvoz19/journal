import { Fragment, useMemo } from 'react'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { BelarusianText } from '../../../../../components/BelarusianText'
import { getMonthLabel, type MonthLabel } from '../../../lib/journal-calendar/monthLabels'
import type { GroupSchedule } from '../../../model/types'
import { getLessonMinutes } from '../schedule-calendar/lib'
import {
  getAttendanceColor,
  getDurationColorStyle,
  getLessonAttendanceStatuses,
  getMonthKey,
  getWeekKey,
  sortSchedules,
} from './lib'
import type { ScheduleStripProps } from './types'

type LessonStripCellProps = {
  schedule: GroupSchedule
  statuses: ReturnType<typeof getLessonAttendanceStatuses>
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
}

const LessonStripCell = (props: LessonStripCellProps) => {
  const { schedule, statuses, disabled, onEdit, onDelete } = props

  const minutes = schedule.isTrialLesson
    ? 0
    : getLessonMinutes({ startTime: schedule.startTime, endTime: schedule.endTime })
  const durationStyle = getDurationColorStyle(minutes)
  const dateDayjs = dayjs(schedule.date)
  const dateLabel = dateDayjs.isValid() ? dateDayjs.format('DD.MM') : schedule.date
  const tooltipTitle = dateDayjs.isValid()
    ? `${dateDayjs.format('DD.MM.YYYY')}, ${schedule.startTime} – ${schedule.endTime}`
    : `${schedule.startTime} – ${schedule.endTime}`

  return (
    <Tooltip title={tooltipTitle} arrow placement="top">
      <Box
        onClick={() => {
          if (!disabled) onEdit()
        }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          width: 44,
          flexShrink: 0,
          p: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          backgroundColor: 'background.paper',
          cursor: disabled ? 'default' : 'pointer',
          ...(disabled ? {} : { '&:hover': { borderColor: 'primary.main' } }),
        }}
      >
        <IconButton
          aria-label="Выдаліць урок"
          size="small"
          color="error"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          sx={{ padding: 0.25 }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>

        <Box sx={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography
            component="span"
            sx={{
              transform: 'rotate(-90deg)',
              whiteSpace: 'nowrap',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {dateLabel}
          </Typography>
        </Box>

        <Box
          aria-label={`Минут: ${minutes}`}
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            ...durationStyle,
          }}
        >
          {minutes}
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: 12,
            flex: 1,
            minHeight: 48,
            borderRadius: '6px',
            overflow: 'hidden',
            mt: 0.25,
          }}
        >
          {statuses.map((status, index) => (
            <Box
              key={`${status}-${index}`}
              sx={{
                flex: 1,
                backgroundColor: getAttendanceColor(status),
                ...(index > 0 ? { borderTop: '1px solid rgba(255, 255, 255, 0.6)' } : {}),
              }}
            />
          ))}
        </Box>
      </Box>
    </Tooltip>
  )
}

type LessonStripItem = {
  schedule: GroupSchedule
  /** Разделитель месяца: вертикальная полоса перед занятием */
  monthDividerLabel: MonthLabel | null
  /** Увеличенный отступ перед занятием с новой недели */
  weekGap: boolean
}

const buildStripItems = (schedules: GroupSchedule[]): LessonStripItem[] => {
  const sorted = sortSchedules(schedules)
  return sorted.map((schedule, index) => {
    const d = dayjs(schedule.date)
    const monthChanged =
      index > 0 && getMonthKey(schedule.date) !== '' && getMonthKey(schedule.date) !== getMonthKey(sorted[index - 1].date)
    const weekChanged =
      index > 0 && getWeekKey(schedule.date) !== '' && getWeekKey(schedule.date) !== getWeekKey(sorted[index - 1].date)

    return {
      schedule,
      monthDividerLabel:
        monthChanged && d.isValid()
          ? getMonthLabel({ year: d.year(), monthIndex0: d.month() })
          : null,
      weekGap: !monthChanged && weekChanged,
    }
  })
}

export const ScheduleStrip = (props: ScheduleStripProps) => {
  const {
    schedules,
    students,
    attendanceMap,
    disabled = false,
    onAddLesson,
    onAddStudent,
    onEditStudent,
    onDeleteStudent,
    onEditLesson,
    onDeleteLesson,
  } = props

  const stripItems = useMemo(() => buildStripItems(schedules), [schedules])

  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontFamily: '"Oswald", sans-serif', fontSize: '1.25rem' }}
        >
          <BelarusianText belarusian="Графік паласой" russian="График полосой" />
        </Typography>
        <Tooltip title="Добавить урок" arrow>
          <IconButton
            aria-label="Дадаць урок"
            size="small"
            color="primary"
            onClick={() => onAddLesson(undefined)}
            disabled={disabled}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 1.5,
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {/* Студэнты: закреплённая слева колонка */}
          <Box
            sx={{
              position: 'sticky',
              left: 0,
              zIndex: 1,
              flexShrink: 0,
              backgroundColor: 'background.paper',
              pr: 1.5,
              borderRight: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                <BelarusianText belarusian="Студэнты" russian="Студенты" />
              </Typography>
              <Tooltip title="Добавить студента" arrow>
                <IconButton
                  aria-label="Дадаць студэнта"
                  size="small"
                  color="primary"
                  onClick={onAddStudent}
                  disabled={disabled}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {students.map((student, index) => (
              <Box
                key={`${student.fullName}-${index}`}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.5 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 18, textAlign: 'right', flexShrink: 0 }}
                >
                  {index + 1}.
                </Typography>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ width: 110, flexShrink: 0 }}
                  title={student.fullName}
                >
                  {student.fullName}
                </Typography>
                <IconButton
                  aria-label="Рэдагаваць студэнта"
                  size="small"
                  color="primary"
                  onClick={() => onEditStudent(index)}
                  disabled={disabled}
                  sx={{ padding: 0.25 }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  aria-label="Выдаліць студэнта"
                  size="small"
                  color="error"
                  onClick={() => onDeleteStudent(index)}
                  disabled={disabled}
                  sx={{ padding: 0.25 }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}

            {students.length === 0 && schedules.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  <BelarusianText belarusian="Не дададзены" russian="Не добавлен" />
                </Typography>
                <Tooltip title="Добавить студента" arrow>
                  <IconButton
                    aria-label="Дадаць студэнта"
                    size="small"
                    color="primary"
                    onClick={onAddStudent}
                    disabled={disabled}
                    sx={{ padding: 0.25 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>

          {/* Заняткі: тыя ж даныя, што і ў асноўным графіку */}
          {stripItems.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                <BelarusianText belarusian="Графік не дададзены" russian="График не добавлен" />
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'stretch' }}>
              {stripItems.map((item, index) => (
                <Fragment
                  key={
                    item.schedule.id ??
                    `${item.schedule.date}-${item.schedule.startTime}-${item.schedule.endTime}-${index}`
                  }
                >
                  {item.monthDividerLabel && (
                    <Tooltip title={item.monthDividerLabel.russian} arrow placement="top">
                      <Box
                        aria-label={item.monthDividerLabel.russian}
                        sx={{
                          width: 4,
                          borderRadius: '2px',
                          backgroundColor: 'divider',
                          alignSelf: 'stretch',
                          flexShrink: 0,
                          mx: 1,
                        }}
                      />
                    </Tooltip>
                  )}
                  {item.weekGap && <Box sx={{ width: 20, flexShrink: 0 }} />}
                  <LessonStripCell
                    schedule={item.schedule}
                    statuses={getLessonAttendanceStatuses({
                      students,
                      schedule: item.schedule,
                      attendanceMap,
                    })}
                    disabled={disabled}
                    onEdit={() => onEditLesson({ schedule: item.schedule })}
                    onDelete={() => onDeleteLesson({ schedule: item.schedule })}
                  />
                </Fragment>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
