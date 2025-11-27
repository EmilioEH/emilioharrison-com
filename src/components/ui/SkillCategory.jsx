import React from 'react';
import BrutalCard from './BrutalCard';

const SkillCategory = ({ title, skills, theme }) => {
    return (
        <BrutalCard theme={theme} className="p-6">
            <h3 className="text-xl font-black mb-3">{title}</h3>
            <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                    <span
                        key={index}
                        className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}
                    >
                        {skill}
                    </span>
                ))}
            </div>
        </BrutalCard>
    );
};

export default SkillCategory;
