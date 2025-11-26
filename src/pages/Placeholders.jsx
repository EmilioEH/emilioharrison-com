import React from 'react';
import SectionTitle from '../components/ui/SectionTitle';

export const About = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>About</SectionTitle><p>UX Researcher & Creative Technologist.</p></div>;
export const Shop = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>Shop</SectionTitle><p>Shop coming soon...</p></div>;
export const Contact = ({ theme }) => <div className="text-center py-20"><SectionTitle theme={theme}>Contact</SectionTitle><p>Get in touch...</p></div>;
