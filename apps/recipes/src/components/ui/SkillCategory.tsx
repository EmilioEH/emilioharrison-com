import React from 'react'
import BrutalCard from './BrutalCard'
import { Heading } from './Typography'
import type { Theme } from '../../lib/themes'

interface SkillCategoryProps {
  title: string
  skills: string[]
  theme: Theme
}

const SkillCategory: React.FC<SkillCategoryProps> = ({ title, skills, theme }) => {
  return (
    <BrutalCard theme={theme} className="p-6">
      <Heading variant="heading-m" className="mb-3">
        {title}
      </Heading>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${
              theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'
            }`}
          >
            {skill}
          </span>
        ))}
      </div>
    </BrutalCard>
  )
}

export default SkillCategory
