import { useNavigate } from 'react-router-dom'
import { BelarusianText } from '../../../../components/BelarusianText'
import {
  GroupForm,
  type GroupFormDonePayload,
} from '../../../../features/groups/ui/group-form/GroupForm'
import { useAppOutletContext } from '../../../../app/providers/router/useAppOutletContext'

export const GroupCreatePage = () => {
  const navigate = useNavigate()
  const { authenticatedFetch } = useAppOutletContext()

  const handleDone = (payload?: GroupFormDonePayload) => {
    navigate({ pathname: '/', search: 'tab=groups' }, { state: payload?.toast ? { toast: payload.toast } : undefined })
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

