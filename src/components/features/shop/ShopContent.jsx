
import React from 'react'
import SectionTitle from '../../ui/SectionTitle'
import Button from '../../ui/Button'
import ContentBlock from '../../ui/ContentBlock'
import { Heading, Text } from '../../ui/Typography'
import { BookOpen } from 'lucide-react'
import { useStore } from '@nanostores/react'
import { themeId } from '../../../lib/store'
import { THEMES } from '../../../lib/themes'

// Shop content component
const ShopContent = () => {
  const currentThemeId = useStore(themeId)
  const theme = THEMES[currentThemeId]

  return (
    <div className="animate-in fade-in duration-700">
      <SectionTitle theme={theme}>Shop</SectionTitle>

      <div className="max-w-3xl">
        <ContentBlock color="bg-white" pin rotate={1} padding="p-8" className="mb-12">
          <Text variant="body-xl" className="mb-6 font-bold">
            I'm building a suite of AI tools designed specifically for UX researchers.
          </Text>
          <Text variant="body-l">Not ready yet, but getting close.</Text>
        </ContentBlock>

        <ContentBlock color="bg-white" padding="p-8" className="mb-12 -rotate-1 transform" pin>
          <Heading variant="heading-l" className="mb-4">
            Want to know when it launches?
          </Heading>
          <Text variant="body-l" className="font-bold">
            Join the email list below.
          </Text>
        </ContentBlock>

        <div>
          <Heading variant="heading-m" className="mb-6 uppercase tracking-wider">
            In the meantime:
          </Heading>
          <div className="flex flex-wrap gap-4">
            <Button href="/fieldnotes" intent="secondary">
              <BookOpen size={20} /> Read Field Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopContent
