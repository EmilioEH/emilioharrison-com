import React from 'react';
import SectionTitle from '../../ui/SectionTitle';
import { useStore } from '@nanostores/react';
import { themeId } from '../../../lib/store';
import { THEMES } from '../../../lib/themes';

const ShopContent = () => {
    const currentThemeId = useStore(themeId);
    const theme = THEMES[currentThemeId];

    return (
        <div className="text-center py-20">
            <SectionTitle theme={theme}>Shop</SectionTitle>
            <p>Shop coming soon...</p>
        </div>
    );
};

export default ShopContent;
