import { useNavigate } from 'react-router-dom'
import { BelarusianText } from '../../../../components/BelarusianText'
import { GroupForm } from '../../../../features/groups/ui/group-form/GroupForm'
import { useAppOutletContext } from '../../../../app/providers/router/useAppOutletContext'

export const GroupCreatePage = () => {
  const navigate = useNavigate()
  const { authenticatedFetch } = useAppOutletContext()

  const handleDone = () => {
    navigate('/')
  }

  const handleCancel = () => {
    navigate('/')
  }

  return (
    <GroupForm
      title={<BelarusianText belarusian="Дадаць групу" russian="Добавить группу" />}
      mode="create"
      authenticatedFetch={authenticatedFetch}
      onDone={handleDone}
      onCancel={handleCancel}
    />
  )
}

