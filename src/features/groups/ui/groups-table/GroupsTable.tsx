import { useEffect, useMemo, useState, type FC } from 'react'
import {
  Alert,
  Box,
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
import { useNavigate } from 'react-router-dom'
import { BelarusianText } from '../../../../components/BelarusianText'
import { ConfirmDialog } from '../../../../components/ConfirmDialog'
import type { AuthenticatedFetch } from '../../model/attendance'
import type { Group } from '../../model/types'
import { deleteGroup, fetchGroups, fetchTeachers } from '../../api/groupsApi'
import { enrichGroupsWithTeachers } from '../../lib/enrichGroupWithTeacher'

type SortField = 'default' | 'level' | 'teacher' | 'subject' | 'name'
type SortOrder = 'asc' | 'desc'

export interface GroupsTableProps {
  authenticatedFetch: AuthenticatedFetch
}

const getSubjectDisplay = (group: Group): string => {
  return group.subject === 'Другой язык'
    ? group.customSubject || group.subject
    : group.subject
}

export const GroupsTable: FC<GroupsTableProps> = ({ authenticatedFetch }) => {
  const navigate = useNavigate()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)

  const [sortField, setSortField] = useState<SortField>('default')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)

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

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true)
      const [nextTeachers, nextGroups] = await Promise.all([
        fetchTeachers({ authenticatedFetch }),
        fetchGroups({ authenticatedFetch }),
      ])
      setGroups(enrichGroupsWithTeachers({ teachers: nextTeachers, groups: nextGroups }))
    } catch (error) {
      console.error('Error fetching groups/teachers:', error)
      showSnackbar('Памылка пры загрузцы груп', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddGroup = () => {
    navigate('/groups/new')
  }

  const handleEditGroup = (group: Group) => {
    if (typeof group.id !== 'number') return
    navigate(`/groups/${group.id}/edit`)
  }

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!groupToDelete || typeof groupToDelete.id !== 'number') return

    try {
      setLoading(true)
      const result = await deleteGroup({ authenticatedFetch, groupId: groupToDelete.id })
      if ('error' in result) {
        showSnackbar(result.error, 'error')
        return
      }
      setShowDeleteConfirm(false)
      setGroupToDelete(null)
      await loadData()
      showSnackbar('Група паспяхова выдалена', 'error')
    } catch (error) {
      console.error('Error deleting group:', error)
      showSnackbar('Памылка пры выдаленні групы', 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }

  const filteredAndSortedGroups = useMemo(() => {
    const query = searchQuery.toLowerCase()
    const filtered = groups.filter((group) => {
      return (
        group.name.toLowerCase().includes(query) ||
        (group.teacherFullName || '').toLowerCase().includes(query)
      )
    })

    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      if (sortField === 'default') {
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
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
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return filtered
  }, [groups, searchQuery, sortField, sortOrder])

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
        <Tooltip title="Дадаць новую групу">
          <IconButton
            aria-label="Дадаць новую групу"
            color="primary"
            onClick={handleAddGroup}
            sx={{ border: '1px solid', borderColor: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="groups-sort-label">Сартыроўка</InputLabel>
          <Select
            labelId="groups-sort-label"
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
                <TableRow key={`${group.id ?? 'no-id'}-${index}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{getSubjectDisplay(group)}</TableCell>
                  <TableCell>{group.level}</TableCell>
                  <TableCell>{group.teacherFullName || ''}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Рэдагаваць групу">
                      <span>
                        <IconButton
                          aria-label="Рэдагаваць групу"
                          size="small"
                          onClick={() => handleEditGroup(group)}
                          color="primary"
                          disabled={typeof group.id !== 'number'}
                        >
                          <EditIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Выдаліць групу">
                      <IconButton
                        aria-label="Выдаліць групу"
                        size="small"
                        onClick={() => handleDeleteClick(group)}
                        color="error"
                        disabled={typeof group.id !== 'number'}
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

