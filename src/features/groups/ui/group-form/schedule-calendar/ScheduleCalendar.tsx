import type { ReactNode } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Badge,
  Box,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import dayjs from 'dayjs'
import { BelarusianText } from '../../../../../components/BelarusianText'
import { getMonthLabel } from '../../../lib/journal-calendar/monthLabels'
import {
  buildMonthGrid,
  WEEKDAY_LABELS_BE_SHORT,
  WEEKDAY_LABELS_RU_SHORT,
  type MonthGridCell,
} from '../../../lib/journal-calendar/monthGrid'
import type { GroupSchedule } from '../../../model/types'
import { getLessonMinutes, getScheduleForDate, groupSchedulesByYearMonth } from './lib'

export type ScheduleCalendarProps = {
  schedules: GroupSchedule[]
  disabled?: boolean
  onAddLesson: (params?: { isoDate?: string }) => void
  onEditLesson: (params: { schedule: GroupSchedule }) => void
  onDeleteLesson: (params: { schedule: GroupSchedule }) => void
  onDeleteMonth: (params: { year: number; monthIndex0: number }) => void
}

const renderDayCell = (params: {
  cell: MonthGridCell
  monthSchedules: GroupSchedule[]
  disabled: boolean
  onAddLesson: (isoDate: string) => void
  onEditLesson: (schedule: GroupSchedule) => void
  onDeleteLesson: (schedule: GroupSchedule) => void
}): ReactNode => {
  const {
    cell,
    monthSchedules,
    disabled,
    onAddLesson,
    onEditLesson,
    onDeleteLesson,
  } = params

  if (cell.kind === 'empty') {
    return <Box sx={{ height: 86, borderRadius: '8px' }} />
  }

  const isoDate = cell.isoDate ?? ''
  const dayOfMonth = cell.dayOfMonth ?? 0
  const schedule = isoDate ? getScheduleForDate({ schedules: monthSchedules, isoDate }) : null
  const trimmedComment = schedule?.comment?.trim() ?? ''

  const minutes = schedule
    ? schedule.isTrialLesson
      ? 0
      : getLessonMinutes({ startTime: schedule.startTime, endTime: schedule.endTime })
    : null

  return (
    <Box
      sx={{
        height: 86,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        p: 0.5,
        position: 'relative',
        backgroundColor: schedule ? 'background.paper' : 'grey.50',
      }}
    >
      <Box sx={{ position: 'absolute', top: 7, left: 2, display: 'flex', gap: 0 }}>
        {schedule ? (
          <>
            <IconButton
              aria-label="Рэдагаваць урок"
              size="small"
              onClick={() => onEditLesson(schedule)}
              disabled={disabled}
              sx={{ padding: 0 }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              aria-label="Выдаліць урок"
              size="small"
              onClick={() => onDeleteLesson(schedule)}
              disabled={disabled}
              color="error"
              sx={{ padding: 0 }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        ) : (
          <IconButton
            aria-label="Дадаць урок"
            size="small"
            onClick={() => onAddLesson(isoDate)}
            disabled={disabled}
            color="primary"
            sx={{ width: 22, height: 22 }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {typeof minutes === 'number' && (
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: 'orange',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}
          aria-label={`Минут: ${minutes}`}
          title={`Минут: ${minutes}`}
        >
          {minutes}
        </Box>
      )}

      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {dayOfMonth}
      </Box>

      {trimmedComment.length > 0 && (
        <Tooltip title={trimmedComment} placement="top" arrow>
          <Box
            aria-label="Каментар"
            sx={{
              position: 'absolute',
              bottom: 2,
              left: 4,
              right: 4,
              px: 0.5,
              py: 0.25,
              border: '1px solid',
              borderColor: 'info.main',
              borderRadius: '8px',
              color: 'info.main',
              backgroundColor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="caption"
              noWrap
              sx={{
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {trimmedComment}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </Box>
  )
}

export const ScheduleCalendar = (props: ScheduleCalendarProps) => {
  const {
    schedules,
    disabled = false,
    onAddLesson,
    onEditLesson,
    onDeleteLesson,
    onDeleteMonth,
  } = props

  const LIGHT_GREEN_BG = '#e8f5e9'

  const grouped = groupSchedulesByYearMonth(schedules)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Заголовок «График» отдельным блоком */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          px: 2,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontFamily: '"Oswald", sans-serif', fontSize: '1.25rem' }}>
            <BelarusianText belarusian="Графік календаром" russian="График календарем" />
          </Typography>
          <Tooltip title="Дадаць дату/урок">
            <IconButton
              aria-label="Дадаць дату/урок"
              size="small"
              color="primary"
              onClick={() => onAddLesson(undefined)}
              disabled={disabled}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {schedules.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          <BelarusianText belarusian="Графік не дададзены" russian="График не добавлен" />
        </Typography>
      ) : (
        /* Контейнер годов: отдельный белый контейнер на каждый год */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Array.from(grouped.entries()).map(([year, yearMap]) => (
            <Paper
              key={year}
              elevation={0}
              sx={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}
            >
              <Accordion
                defaultExpanded
                disableGutters
                sx={{
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  overflow: 'hidden',
                  '&.Mui-expanded': { margin: 0 },
                  backgroundColor: 'transparent',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 1.5,
                    borderLeft: '4px solid',
                    borderLeftColor: 'primary.main',
                    backgroundColor: 'rgba(46, 125, 50, 0.06)',
                    '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.1)' },
                    '& .MuiAccordionSummary-content': { alignItems: 'center', py: 0.5 },
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {year}
                    <Badge
                      color="primary"
                      badgeContent={Array.from(yearMap.values()).reduce((acc, list) => acc + list.length, 0)}
                      sx={{ '& .MuiBadge-badge': { fontSize: 11 } }}
                    >
                      <EventAvailableIcon fontSize="small" />
                    </Badge>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 1.5, pt: 1.5, backgroundColor: 'transparent' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, 1fr)',
                    },
                  }}
                >
                  {Array.from(yearMap.entries()).map(([monthIndex0, monthSchedules]) => {
                    const label = getMonthLabel({ year, monthIndex0 })
                    const monthCells = buildMonthGrid({ year, monthIndex0 })

                    const monthKey = `${year}-${monthIndex0}`
                    const monthStart = dayjs(new Date(year, monthIndex0, 1)).format('YYYY-MM')

                    return (
                      <Box
                        key={monthKey}
                        sx={{
                          minWidth: 0,
                          borderRadius: '8px',
                          backgroundColor: LIGHT_GREEN_BG,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            px: 1,
                            py: 1,
                            backgroundColor: LIGHT_GREEN_BG,
                          }}
                        >
                          <Tooltip title={label.russian} arrow placement="top">
                            <Typography variant="subtitle2" component="span">
                              {label.belarusian}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={`Выдаліць месяц (${monthStart})`}>
                            <IconButton
                              aria-label={`Выдаліць месяц ${label.russian}`}
                              size="small"
                              color="error"
                              onClick={() => onDeleteMonth({ year, monthIndex0 })}
                              disabled={disabled}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>

                        <Box sx={{ px: 1, py: 1, backgroundColor: LIGHT_GREEN_BG }}>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                              gap: 0.5,
                              mb: 0.75,
                            }}
                          >
                            {WEEKDAY_LABELS_BE_SHORT.map((be, index) => (
                              <Typography
                                key={be}
                                variant="caption"
                                sx={{ textAlign: 'center', fontWeight: 700, opacity: 0.75 }}
                              >
                                <BelarusianText belarusian={be} russian={WEEKDAY_LABELS_RU_SHORT[index] ?? be} />
                              </Typography>
                            ))}
                          </Box>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                              gap: 0.5,
                            }}
                          >
                            {monthCells.map((cell, index) => (
                              <Box key={`${monthKey}-${index}`}>
                                {renderDayCell({
                                  cell,
                                  monthSchedules,
                                  disabled,
                                  onAddLesson: (isoDate) => onAddLesson({ isoDate }),
                                  onEditLesson: (schedule) => onEditLesson({ schedule }),
                                  onDeleteLesson: (schedule) => onDeleteLesson({ schedule }),
                                })}
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
                </AccordionDetails>
              </Accordion>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  )
}

