import { Alert, Box, Button } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import { BelarusianText } from '../../../../components/BelarusianText'
import { useAppOutletContext } from '../../../../app/providers/router/useAppOutletContext'
import { GroupForm } from '../../../../features/groups/ui/group-form/GroupForm'

const parseGroupId = (value: string | undefined): number | null => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const GroupEditPage = () => {
  const navigate = useNavigate()
  const params = useParams<{ groupId: string }>()
  const groupId = parseGroupId(params.groupId)
  const { authenticatedFetch } = useAppOutletContext()

  const handleDone = () => {
    navigate('/')
  }

  const handleCancel = () => {
    navigate('/')
  }

  if (!groupId) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="error">
          <BelarusianText
            belarusian="Няправільны ідэнтыфікатар групы"
            russian="Некорректный идентификатор группы"
          />
        </Alert>
        <Box>
          <Button variant="outlined" onClick={() => navigate('/')}>
            <BelarusianText belarusian="Назад" russian="Назад" />
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <GroupForm
      title={<BelarusianText belarusian="Рэдагаваць групу" russian="Редактировать группу" />}
      mode="edit"
      groupId={groupId}
      authenticatedFetch={authenticatedFetch}
      onDone={handleDone}
      onCancel={handleCancel}
    />
  )
}

