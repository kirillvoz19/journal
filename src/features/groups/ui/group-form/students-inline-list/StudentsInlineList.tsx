import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { BelarusianText } from '../../../../../components/BelarusianText'
import type { GroupStudent } from '../../../model/types'

export type StudentsInlineListProps = {
  students: GroupStudent[]
  disabled?: boolean
  onAddStudent: () => void
  onEditStudent: (index: number) => void
  onDeleteStudent: (index: number) => void
}

export const StudentsInlineList = (props: StudentsInlineListProps) => {
  const { students, disabled = false, onAddStudent, onEditStudent, onDeleteStudent } = props

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1">
          <BelarusianText belarusian="Студэнты" russian="Студенты" />
        </Typography>
        <Tooltip title="Дадаць студэнта">
          <IconButton
            aria-label="Дадаць студэнта"
            size="small"
            color="primary"
            onClick={onAddStudent}
            disabled={disabled}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {students.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          <BelarusianText belarusian="Студэнты не дададзены" russian="Студенты не добавлены" />
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {students.map((student, index) => (
            <Box
              key={`${student.fullName}-${index}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                flex: '1 1 calc(20% - 8px)',
                minWidth: 220,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={student.fullName}
              >
                {student.fullName}
              </Typography>

              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <IconButton
                  aria-label="Рэдагаваць студэнта"
                  size="small"
                  onClick={() => onEditStudent(index)}
                  color="primary"
                  disabled={disabled}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Выдаліць студэнта"
                  size="small"
                  onClick={() => onDeleteStudent(index)}
                  color="error"
                  disabled={disabled}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

