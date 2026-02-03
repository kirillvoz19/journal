import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { BelarusianText } from '../../../components/BelarusianText'
import { Groups } from '../../../components/Groups'
import { Teachers } from '../../../components/Teachers'
import { useAppOutletContext } from '../../../app/providers/router/useAppOutletContext'

export const HomePage = () => {
  const { authenticatedFetch } = useAppOutletContext()

  return (
    <Box>
      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <BelarusianText belarusian="Групы" russian="Группы" />
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Groups authenticatedFetch={authenticatedFetch} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>
            <BelarusianText
              belarusian="Выкладчыкі"
              russian="Преподаватели"
            />
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Teachers authenticatedFetch={authenticatedFetch} />
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

